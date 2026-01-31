package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const AppName = "Neat Reader"

type LoggingTransport struct {
	Transport http.RoundTripper
}

func (lt *LoggingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	start := time.Now()

	log.Printf(">>> 请求开始: %s %s", req.Method, req.URL.String())

	if req.Body != nil && req.Body != http.NoBody {
		bodyBytes, err := io.ReadAll(req.Body)
		if err == nil {
			log.Printf(">>> 请求体: %s", string(bodyBytes))
			req.Body = io.NopCloser(bytes.NewReader(bodyBytes))
		}
	}

	resp, err := lt.Transport.RoundTrip(req)

	elapsed := time.Since(start)

	if err != nil {
		log.Printf("<<< 请求失败: %s %s - 耗时: %v - 错误: %v", req.Method, req.URL.String(), elapsed, err)
		return nil, err
	}

	log.Printf("<<< 响应状态: %d - 耗时: %v", resp.StatusCode, elapsed)

	if resp.Body != nil && resp.Body != http.NoBody {
		bodyBytes, err := io.ReadAll(resp.Body)
		if err == nil {
			log.Printf("<<< 响应体: %s", string(bodyBytes))
			resp.Body = io.NopCloser(bytes.NewReader(bodyBytes))
		}
	}

	return resp, nil
}

type App struct {
	ctx    context.Context
	config *Config
	client *http.Client
}

type Config struct {
	Port int
}

func NewApp() *App {
	loggingTransport := &LoggingTransport{
		Transport: http.DefaultTransport,
	}

	return &App{
		config: &Config{
			Port: 3001,
		},
		client: &http.Client{
			Transport: loggingTransport,
		},
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	log.Println("Neat Reader starting...")
}

func (a *App) shutdown(ctx context.Context) {
	log.Println("Neat Reader shutting down...")
}

func (a *App) GetHealth() string {
	return `{"status": "ok"}`
}

func (a *App) GetConfig() *Config {
	return a.config
}

func (a *App) UploadFile(fileName string, fileData []byte, accessToken string) string {
	log.Printf("[Upload] 开始上传文件: %s, 大小: %d", fileName, len(fileData))

	tmpFile, err := os.CreateTemp("", "upload-*.tmp")
	if err != nil {
		log.Printf("[Upload] 创建临时文件失败: %v", err)
		return fmt.Sprintf(`{"error": "Failed to create temp file: %v"}`, err)
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	_, err = tmpFile.Write(fileData)
	if err != nil {
		log.Printf("[Upload] 写入临时文件失败: %v", err)
		return fmt.Sprintf(`{"error": "Failed to write temp file: %v"}`, err)
	}
	tmpFile.Seek(0, 0)

	result := a.singleUpload(accessToken, fileName, tmpFile)
	return result
}

func (a *App) singleUpload(accessToken, filePath string, file *os.File) string {
	baiduPath := getBaiduPath(filePath)
	log.Printf("[SingleUpload] 百度路径: %s", baiduPath)

	uploadDomain, err := a.getUploadDomain(accessToken, baiduPath)
	if err != nil {
		log.Printf("[SingleUpload] 获取上传域名失败: %v", err)
		return fmt.Sprintf(`{"error": "Failed to get upload domain: %v"}`, err)
	}

	uploadURL := fmt.Sprintf("%s/rest/2.0/pcs/file?method=upload&access_token=%s&path=%s&ondup=overwrite", uploadDomain, accessToken, url.QueryEscape(baiduPath))
	log.Printf("[SingleUpload] 上传URL: %s", uploadURL)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "upload")
	if err != nil {
		log.Printf("[SingleUpload] 创建表单文件失败: %v", err)
		return fmt.Sprintf(`{"error": "Failed to create form file: %v"}`, err)
	}
	if _, err := io.Copy(part, file); err != nil {
		log.Printf("[SingleUpload] 写入表单文件失败: %v", err)
		return fmt.Sprintf(`{"error": "Failed to copy file: %v"}`, err)
	}
	writer.Close()

	resp, err := http.Post(uploadURL, writer.FormDataContentType(), body)
	if err != nil {
		log.Printf("[SingleUpload] HTTP请求错误: %v", err)
		return fmt.Sprintf(`{"error": "HTTP request failed: %v"}`, err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[SingleUpload] 读取响应失败: %v", err)
		return fmt.Sprintf(`{"error": "Failed to read response: %v"}`, err)
	}

	log.Printf("[SingleUpload] 原始响应: %s", string(respBody))

	var errorResp struct {
		ErrorCode int    `json:"error_code"`
		ErrorMsg  string `json:"error_msg"`
	}

	if err := json.Unmarshal(respBody, &errorResp); err == nil && errorResp.ErrorCode != 0 {
		log.Printf("[SingleUpload] 上传失败，error_code: %d, error_msg: %s", errorResp.ErrorCode, errorResp.ErrorMsg)
		return fmt.Sprintf(`{"error": "upload failed: error_code=%d, error_msg=%s", "error_code": %d, "error_msg": "%s"}`, errorResp.ErrorCode, errorResp.ErrorMsg, errorResp.ErrorCode, errorResp.ErrorMsg)
	}

	return string(respBody)
}

func getBaiduPath(relativePath string) string {
	cleanPath := strings.TrimPrefix(relativePath, "/")
	if cleanPath == "" {
		return fmt.Sprintf("/apps/%s", AppName)
	}
	return fmt.Sprintf("/apps/%s/%s", AppName, cleanPath)
}

func (a *App) getUploadDomain(accessToken, filePath string) (string, error) {
	locateUrl := fmt.Sprintf("https://d.pcs.baidu.com/rest/2.0/pcs/file?method=locateupload&appid=250528&access_token=%s&path=%s&upload_version=2.0&uploadid=temp", accessToken, url.QueryEscape(filePath))

	resp, err := a.client.Get(locateUrl)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var locateResp struct {
		Servers []struct {
			Server string `json:"server"`
		} `json:"servers"`
		ErrorCode int    `json:"error_code"`
		ErrorMsg  string `json:"error_msg"`
	}

	if err := json.Unmarshal(body, &locateResp); err != nil {
		return "", err
	}

	if locateResp.ErrorCode != 0 {
		return "", fmt.Errorf("locate upload failed: error_code=%d, error_msg=%s", locateResp.ErrorCode, locateResp.ErrorMsg)
	}

	if len(locateResp.Servers) == 0 {
		return "", fmt.Errorf("no servers in response")
	}

	return locateResp.Servers[0].Server, nil
}

func (a *App) VerifyToken(accessToken string) string {
	infoURL := "https://pan.baidu.com/rest/2.0/xpan/nas?method=uinfo&access_token=" + accessToken
	resp, err := a.client.Get(infoURL)
	if err != nil {
		return fmt.Sprintf(`{"error": "%v"}`, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	return string(body)
}

func (a *App) GetFileList(accessToken string, dir string, pageNum int, pageSize int, order string, method string, recursion int) string {
	params := url.Values{}
	params.Set("access_token", accessToken)
	params.Set("dir", dir)
	params.Set("pageNum", fmt.Sprintf("%d", pageNum))
	params.Set("pageSize", fmt.Sprintf("%d", pageSize))
	params.Set("order", order)
	params.Set("method", method)
	params.Set("recursion", fmt.Sprintf("%d", recursion))

	fileURL := "https://pan.baidu.com/rest/2.0/xpan/file?" + params.Encode()
	resp, err := a.client.Get(fileURL)
	if err != nil {
		return fmt.Sprintf(`{"error": "%v"}`, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	return string(body)
}

func (a *App) GetFileInfo(accessToken string, fsids string) string {
	params := url.Values{}
	params.Set("access_token", accessToken)
	params.Set("fsids", fmt.Sprintf("[%s]", fsids))
	params.Set("dlink", "1")

	fileURL := "https://pan.baidu.com/rest/2.0/xpan/file?method=filemetas&" + params.Encode()
	resp, err := a.client.Get(fileURL)
	if err != nil {
		return fmt.Sprintf(`{"error": "%v"}`, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	return string(body)
}

type DownloadResult struct {
	Success bool   `json:"success"`
	Data    []int  `json:"data"`
	Error   string `json:"error,omitempty"`
}

func (a *App) DownloadFile(dlink string, accessToken string) DownloadResult {
	downloadURL := fmt.Sprintf("%s&access_token=%s", dlink, accessToken)

	req, err := http.NewRequest("GET", downloadURL, nil)
	if err != nil {
		log.Printf("[DownloadFile] 创建请求失败: %v", err)
		return DownloadResult{Success: false, Error: err.Error()}
	}

	req.Header.Set("User-Agent", "pan.baidu.com")

	resp, err := a.client.Do(req)
	if err != nil {
		log.Printf("[DownloadFile] 下载失败: %v", err)
		return DownloadResult{Success: false, Error: err.Error()}
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[DownloadFile] 下载失败，状态码: %d", resp.StatusCode)
		return DownloadResult{Success: false, Error: fmt.Sprintf("HTTP %d", resp.StatusCode)}
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[DownloadFile] 读取响应失败: %v", err)
		return DownloadResult{Success: false, Error: err.Error()}
	}

	log.Printf("[DownloadFile] 下载成功，文件大小: %d 字节", len(body))

	data := make([]int, len(body))
	for i, b := range body {
		data[i] = int(b)
	}

	return DownloadResult{Success: true, Data: data}
}

func (a *App) SearchFiles(accessToken string, key string, dir string, method string, recursion int) string {
	params := url.Values{}
	params.Set("access_token", accessToken)
	params.Set("key", key)
	params.Set("dir", dir)
	params.Set("method", method)
	params.Set("recursion", fmt.Sprintf("%d", recursion))

	searchURL := "https://pan.baidu.com/rest/2.0/xpan/file?" + params.Encode()
	resp, err := a.client.Get(searchURL)
	if err != nil {
		return fmt.Sprintf(`{"error": "%v"}`, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	return string(body)
}

func (a *App) GetTokenViaCode(code string, clientId string, clientSecret string, redirectUri string) string {
	tokenURL := "https://openapi.baidu.com/oauth/2.0/token"
	params := url.Values{}
	params.Set("grant_type", "authorization_code")
	params.Set("code", code)
	params.Set("client_id", clientId)
	params.Set("client_secret", clientSecret)
	params.Set("redirect_uri", redirectUri)

	resp, err := a.client.PostForm(tokenURL, params)
	if err != nil {
		return fmt.Sprintf(`{"error": "%v"}`, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	return string(body)
}

func (a *App) RefreshToken(refreshToken string, clientId string, clientSecret string) string {
	tokenURL := "https://openapi.baidu.com/oauth/2.0/token"
	params := url.Values{}
	params.Set("grant_type", "refresh_token")
	params.Set("refresh_token", refreshToken)
	params.Set("client_id", clientId)
	params.Set("client_secret", clientSecret)

	resp, err := a.client.PostForm(tokenURL, params)
	if err != nil {
		return fmt.Sprintf(`{"error": "%v"}`, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	return string(body)
}

func (a *App) GetTokenViaAlist(alistUrl string, username string, password string) string {
	loginURL := alistUrl + "/api/auth/login"
	params := map[string]string{
		"username": username,
		"password": password,
	}
	jsonData, _ := json.Marshal(params)

	req, err := http.NewRequest("POST", loginURL, strings.NewReader(string(jsonData)))
	if err != nil {
		return fmt.Sprintf(`{"error": "%v"}`, err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		return fmt.Sprintf(`{"error": "%v"}`, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	return string(body)
}

func (a *App) OpenDirectory() string {
	path, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择文件夹",
	})
	if err != nil {
		return fmt.Sprintf(`{"error": "%v"}`, err)
	}
	if path == "" {
		return `{"path": ""}`
	}
	return fmt.Sprintf(`{"path": "%s"}`, path)
}

func (a *App) ReadFile(path string) []byte {
	data, err := os.ReadFile(path)
	if err != nil {
		log.Printf("Error reading file: %v", err)
		return nil
	}
	return data
}

func (a *App) SelectFile() string {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择文件",
	})
	if err != nil {
		return fmt.Sprintf(`{"error": "%v"}`, err)
	}
	if filePath == "" {
		return `{"path": ""}`
	}
	return fmt.Sprintf(`{"path": "%s"}`, filePath)
}
