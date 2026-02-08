import{d as Ce,u as _e,c,a as e,t as g,w as j,v as L,n as _,b as B,r as m,o as i,e as P,_ as ze,h as se,f as ge,g as Fe,i as f,F as te,j as ae,k as C,l as ve,m as Q,p as q,q as H,s as S,x as Ne,y as ke}from"./index-xevC7b_N.js";import{d as Ye}from"./dayjs.min-BjuRxaeg.js";import{u as De,a as oe}from"./ebook-BOpimmoC.js";const Ze=""+new URL("appicon.Dx3HGttL.png",import.meta.url).href,Xe={class:"settings-panel"},Ge={class:"settings-content"},Oe={class:"setting-section"},Qe={class:"setting-card"},We={class:"setting-row"},Je={class:"setting-info"},et={key:0,class:"setting-desc"},tt={key:1,class:"setting-desc"},at={class:"setting-control"},st={key:0,class:"status connected"},ot={key:1,class:"status disconnected"},nt={key:0,class:"setting-row"},lt={class:"setting-info",style:{width:"100%"}},rt=["disabled"],it={key:1,class:"setting-row"},ct={class:"setting-section"},dt={class:"setting-card"},ut={class:"setting-row"},ht={class:"setting-info"},yt={class:"setting-desc"},pt={class:"setting-control"},gt={class:"toggle-group"},vt={class:"setting-row"},kt={class:"setting-info"},mt={class:"setting-desc"},ft={class:"setting-control"},wt=["value"],Mt=Ce({__name:"index",props:{baidupanUser:{},viewMode:{}},emits:["cancelBaidupanAuth","showBaidupanAuthDialog","updateViewMode"],setup(y){const u=De(),n=_e(),r=P(()=>u.userConfig.storage),v=m(""),b=m(""),k=m(!1),h=()=>{console.log("=== 开始获取授权 ==="),console.log("当前环境检测:"),console.log("- window.electron 存在:",!!window.electron),console.log("- window.location.href:",window.location.href);const d="https://openapi.baidu.com/oauth/2.0/authorize?response_type=code&client_id=hq9yQ9w9kR4YHj1kyYafLygVocobh7Sf&redirect_uri=https://alistgo.com/tool/baidu/callback&scope=basic,netdisk&qrcode=1";console.log("授权URL:",d);try{if(window.electron)console.log("✓ 检测到Electron环境，使用内置窗口处理授权"),console.log("调用 window.electron.openAuthWindow..."),window.electron.openAuthWindow(d).then(o=>{console.log("openAuthWindow 返回结果:",o),o.success&&o.code?(console.log("✓ 获取到授权码:",o.code),z(o.code)):(console.error("✗ 授权失败:",o.error),n.showErrorDialog("授权失败",o.error||"用户取消授权"))}).catch(o=>{console.error("✗ 授权窗口Promise异常:",o),n.showErrorDialog("授权失败","无法打开授权窗口: "+o.message)});else{console.log("✓ 浏览器环境，使用外部浏览器打开授权页面");const o=x=>{if(console.log("收到 postMessage:",x.data),x.origin!==window.location.origin){console.warn("忽略来自不同源的消息:",x.origin);return}x.data&&x.data.type==="baidu-auth-code"&&x.data.code&&(console.log("✓ 收到授权码:",x.data.code),window.removeEventListener("message",o),z(x.data.code))};window.addEventListener("message",o),console.log("✓ 已添加 postMessage 监听器"),window.open(d,"_blank","width=800,height=600")?(console.log("✓ 外部浏览器窗口打开成功"),n.showDialog({title:"授权提示",message:"请在打开的页面中完成授权，授权成功后会自动获取授权信息",type:"info"})):(console.error("✗ 外部浏览器窗口被阻止"),window.removeEventListener("message",o),n.showErrorDialog("窗口被阻止","请允许弹出窗口"))}}catch(o){console.error("✗ 获取授权过程异常:",o),console.error("异常详情:",{message:o.message,stack:o.stack,name:o.name}),n.showErrorDialog("打开失败","无法打开授权页面: "+o.message)}console.log("=== 获取授权函数执行完成 ===")},z=async d=>{console.log("=== 开始通过alist API处理授权码 ==="),console.log("授权码:",d),k.value=!0;try{console.log("准备调用后端API: /api/baidu/alist-token");const o=await fetch("/api/baidu/alist-token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:d})});console.log("后端API响应状态:",o.status,o.statusText);const p=await o.json();console.log("后端API响应数据:",p),!p.error&&p.access_token&&p.refresh_token?(console.log("✓ 成功获取token"),console.log("- access_token:",p.access_token?"已获取":"未获取"),console.log("- refresh_token:",p.refresh_token?"已获取":"未获取"),b.value=p.access_token,v.value=p.refresh_token,console.log("开始自动验证并连接..."),V()):(console.error("✗ 获取Token失败:",p.error||"响应数据格式错误"),n.showErrorDialog("获取Token失败",p.error||"未知错误"))}catch(o){console.error("✗ 调用alist API异常:",o),console.error("异常详情:",{message:o.message,stack:o.stack,name:o.name}),n.showErrorDialog("获取Token失败","网络错误，请重试: "+o.message)}finally{k.value=!1,console.log("=== alist API处理完成 ===")}},E=async()=>{if(v.value){k.value=!0;try{const d=await oe.refreshToken(v.value,"hq9yQ9w9kR4YHj1kyYafLygVocobh7Sf","YH2VpZcFJHYNnV6vLfHQXDBhcE7ZChyE");!d.error&&d.access_token?(b.value=d.access_token,d.refresh_token&&(v.value=d.refresh_token),V()):n.showErrorDialog("获取失败",d.error||"未知错误")}catch{n.showErrorDialog("获取失败","网络错误，请重试")}finally{k.value=!1}}},V=async()=>{var d,o;if(b.value){k.value=!0;try{const p=await oe.verifyToken(b.value);p.error?n.showErrorDialog("验证失败",p.message||"无效的token"):(await u.updateUserConfig({storage:{...r.value,baidupan:{...r.value.baidupan,accessToken:b.value,refreshToken:v.value,userId:String(p.uk),expiration:Date.now()+720*60*60*1e3,rootPath:((d=r.value.baidupan)==null?void 0:d.rootPath)||"",namingStrategy:((o=r.value.baidupan)==null?void 0:o.namingStrategy)||"0"}}}),await u.fetchBaidupanUserInfo(!0),n.showSuccessDialog("百度网盘授权成功"))}catch{n.showErrorDialog("验证失败","网络错误，请重试")}finally{k.value=!1}}},D=async()=>{await u.updateUserConfig({storage:{...r.value,baidupan:{...r.value.baidupan,accessToken:"",refreshToken:"",userId:"",expiration:0,rootPath:"",namingStrategy:"0"}}}),v.value="",b.value="",await u.fetchBaidupanUserInfo(!0),n.showSuccessDialog("已取消授权")},K=async d=>{const o=d.target;await u.updateUserConfig({ui:{...u.userConfig.ui,language:o.value}})};return(d,o)=>(i(),c("div",Xe,[o[9]||(o[9]=e("div",{class:"settings-header"},[e("h2",{class:"settings-title"},"设置")],-1)),e("div",Ge,[e("section",Oe,[o[4]||(o[4]=e("h3",{class:"section-title"},"百度网盘",-1)),e("div",Qe,[e("div",We,[e("div",Je,[o[3]||(o[3]=e("span",{class:"setting-label"},"授权状态",-1)),y.baidupanUser?(i(),c("span",et,"已连接："+g(y.baidupanUser.baidu_name),1)):(i(),c("span",tt,'点击"获取授权"按钮打开授权页面获取密钥信息'))]),e("div",at,[y.baidupanUser?(i(),c("span",st,"已授权")):(i(),c("span",ot,"未授权"))])]),y.baidupanUser?(i(),c("div",it,[e("div",{class:"setting-info",style:{width:"100%"}},[e("button",{class:"btn btn-danger",style:{width:"100%"},onClick:D}," 取消授权 ")])])):(i(),c("div",nt,[e("div",lt,[e("button",{class:"btn btn-secondary",style:{width:"100%","margin-bottom":"12px"},onClick:h}," 获取授权 "),j(e("input",{type:"text",class:"form-control","onUpdate:modelValue":o[0]||(o[0]=p=>v.value=p),placeholder:"Refresh Token（授权后自动填入或手动粘贴）",style:{width:"100%","margin-bottom":"12px"}},null,512),[[L,v.value]]),e("button",{class:"btn btn-primary",style:{width:"100%"},onClick:E,disabled:!v.value||k.value},g(k.value?"获取中...":"连接百度网盘"),9,rt)])]))])]),e("section",ct,[o[8]||(o[8]=e("h3",{class:"section-title"},"外观",-1)),e("div",dt,[e("div",ut,[e("div",ht,[o[5]||(o[5]=e("span",{class:"setting-label"},"视图模式",-1)),e("span",yt,g(y.viewMode==="grid"?"网格":"列表"),1)]),e("div",pt,[e("div",gt,[e("button",{class:_(["toggle-btn",{active:y.viewMode==="grid"}]),onClick:o[1]||(o[1]=p=>d.$emit("updateViewMode","grid"))},"网格",2),e("button",{class:_(["toggle-btn",{active:y.viewMode==="list"}]),onClick:o[2]||(o[2]=p=>d.$emit("updateViewMode","list"))},"列表",2)])])]),e("div",vt,[e("div",kt,[o[6]||(o[6]=e("span",{class:"setting-label"},"语言",-1)),e("span",mt,g(B(u).userConfig.ui.language==="zh-CN"?"简体中文":"English"),1)]),e("div",ft,[e("select",{class:"form-control",value:B(u).userConfig.ui.language,onChange:K},[...o[7]||(o[7]=[e("option",{value:"zh-CN"},"简体中文",-1),e("option",{value:"en-US"},"English",-1)])],40,wt)])])])])])]))}}),bt=ze(Mt,[["__scopeId","data-v-ad8264c6"]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xt=y=>{for(const u in y)if(u.startsWith("aria-")||u==="role"||u==="title")return!0;return!1};/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const me=y=>y==="";/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ct=(...y)=>y.filter((u,n,r)=>!!u&&u.trim()!==""&&r.indexOf(u)===n).join(" ").trim();/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fe=y=>y.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _t=y=>y.replace(/^([A-Z])|[\s-_]+(\w)/g,(u,n,r)=>r?r.toUpperCase():n.toLowerCase());/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zt=y=>{const u=_t(y);return u.charAt(0).toUpperCase()+u.slice(1)};/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Y={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dt=({name:y,iconNode:u,absoluteStrokeWidth:n,"absolute-stroke-width":r,strokeWidth:v,"stroke-width":b,size:k=Y.width,color:h=Y.stroke,...z},{slots:E})=>se("svg",{...Y,...z,width:k,height:k,stroke:h,"stroke-width":me(n)||me(r)||n===!0||r===!0?Number(v||b||Y["stroke-width"])*24/Number(k):v||b||Y["stroke-width"],class:Ct("lucide",z.class,...y?[`lucide-${fe(zt(y))}-icon`,`lucide-${fe(y)}`]:["lucide-icon"]),...!E.default&&!xt(z)&&{"aria-hidden":"true"}},[...u.map(V=>se(...V)),...E.default?[E.default()]:[]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=(y,u)=>(n,{slots:r,attrs:v})=>se(Dt,{...v,...n,iconNode:u,name:y},r);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tt=l("banknote",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const we=l("book-open",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Et=l("brain-circuit",[["path",{d:"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",key:"l5xja"}],["path",{d:"M9 13a4.5 4.5 0 0 0 3-4",key:"10igwf"}],["path",{d:"M6.003 5.125A3 3 0 0 0 6.401 6.5",key:"105sqy"}],["path",{d:"M3.477 10.896a4 4 0 0 1 .585-.396",key:"ql3yin"}],["path",{d:"M6 18a4 4 0 0 1-1.967-.516",key:"2e4loj"}],["path",{d:"M12 13h4",key:"1ku699"}],["path",{d:"M12 18h6a2 2 0 0 1 2 2v1",key:"105ag5"}],["path",{d:"M12 8h8",key:"1lhi5i"}],["path",{d:"M16 8V5a2 2 0 0 1 2-2",key:"u6izg6"}],["circle",{cx:"16",cy:"13",r:".5",key:"ry7gng"}],["circle",{cx:"18",cy:"3",r:".5",key:"1aiba7"}],["circle",{cx:"20",cy:"21",r:".5",key:"yhc1fs"}],["circle",{cx:"20",cy:"8",r:".5",key:"1e43v0"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $t=l("brain",[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const At=l("briefcase",[["path",{d:"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",key:"jecpp"}],["rect",{width:"20",height:"14",x:"2",y:"6",rx:"2",key:"i6l2r4"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const St=l("building-2",[["path",{d:"M10 12h4",key:"a56b0p"}],["path",{d:"M10 8h4",key:"1sr2af"}],["path",{d:"M14 21v-3a2 2 0 0 0-4 0v3",key:"1rgiei"}],["path",{d:"M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2",key:"secmi2"}],["path",{d:"M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16",key:"16ra0t"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bt=l("camera",[["path",{d:"M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z",key:"18u6gg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vt=l("castle",[["path",{d:"M10 5V3",key:"1y54qe"}],["path",{d:"M14 5V3",key:"m6isi"}],["path",{d:"M15 21v-3a3 3 0 0 0-6 0v3",key:"lbp5hj"}],["path",{d:"M18 3v8",key:"2ollhf"}],["path",{d:"M18 5H6",key:"98imr9"}],["path",{d:"M22 11H2",key:"1lmjae"}],["path",{d:"M22 9v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9",key:"1rly83"}],["path",{d:"M6 3v8",key:"csox7g"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ht=l("chart-pie",[["path",{d:"M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z",key:"pzmjnu"}],["path",{d:"M21.21 15.89A10 10 0 1 1 8 2.83",key:"k2fpak"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jt=l("chef-hat",[["path",{d:"M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z",key:"1qvrer"}],["path",{d:"M6 17h12",key:"1jwigz"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lt=l("church",[["path",{d:"M10 9h4",key:"u4k05v"}],["path",{d:"M12 7v5",key:"ma6bk"}],["path",{d:"M14 21v-3a2 2 0 0 0-4 0v3",key:"1rgiei"}],["path",{d:"m18 9 3.52 2.147a1 1 0 0 1 .48.854V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6.999a1 1 0 0 1 .48-.854L6 9",key:"flvdwo"}],["path",{d:"M6 21V7a1 1 0 0 1 .376-.782l5-3.999a1 1 0 0 1 1.249.001l5 4A1 1 0 0 1 18 7v14",key:"a5i0n2"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ut=l("cloud-upload",[["path",{d:"M12 13v8",key:"1l5pq0"}],["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242",key:"1pljnt"}],["path",{d:"m8 17 4-4 4 4",key:"1quai1"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qt=l("cloud",[["path",{d:"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z",key:"p7xjir"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pt=l("code-xml",[["path",{d:"m18 16 4-4-4-4",key:"1inbqp"}],["path",{d:"m6 8-4 4 4 4",key:"15zrgr"}],["path",{d:"m14.5 4-5 16",key:"e7oirm"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kt=l("cpu",[["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M17 20v2",key:"1rnc9c"}],["path",{d:"M17 2v2",key:"11trls"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M2 17h2",key:"7oei6x"}],["path",{d:"M2 7h2",key:"asdhe0"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"M20 17h2",key:"1fpfkl"}],["path",{d:"M20 7h2",key:"1o8tra"}],["path",{d:"M7 20v2",key:"4gnj0m"}],["path",{d:"M7 2v2",key:"1i4yhu"}],["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"8",y:"8",width:"8",height:"8",rx:"1",key:"z9xiuo"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const It=l("download",[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rt=l("file-text",[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ft=l("film",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M7 3v18",key:"bbkbws"}],["path",{d:"M3 7.5h4",key:"zfgn84"}],["path",{d:"M3 12h18",key:"1i2n21"}],["path",{d:"M3 16.5h4",key:"1230mu"}],["path",{d:"M17 3v18",key:"in4fa5"}],["path",{d:"M17 7.5h4",key:"myr1c1"}],["path",{d:"M17 16.5h4",key:"go4c1d"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nt=l("flag",[["path",{d:"M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528",key:"1jaruq"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yt=l("flask-conical",[["path",{d:"M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2",key:"18mbvz"}],["path",{d:"M6.453 15h11.094",key:"3shlmq"}],["path",{d:"M8.5 2h7",key:"csnxdl"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zt=l("flower-2",[["path",{d:"M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1",key:"3pnvol"}],["circle",{cx:"12",cy:"8",r:"2",key:"1822b1"}],["path",{d:"M12 10v12",key:"6ubwww"}],["path",{d:"M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z",key:"9hd38g"}],["path",{d:"M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z",key:"ufn41s"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Me=l("folder",[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",key:"1kt360"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xt=l("ghost",[["path",{d:"M9 10h.01",key:"qbtxuw"}],["path",{d:"M15 10h.01",key:"1qmjsl"}],["path",{d:"M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z",key:"uwwb07"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gt=l("globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ot=l("graduation-cap",[["path",{d:"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z",key:"j76jl0"}],["path",{d:"M22 10v6",key:"1lu8f3"}],["path",{d:"M6 12.5V16a6 3 0 0 0 12 0v-3.5",key:"1r8lef"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qt=l("hard-drive",[["line",{x1:"22",x2:"2",y1:"12",y2:"12",key:"1y58io"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}],["line",{x1:"6",x2:"6.01",y1:"16",y2:"16",key:"sgf278"}],["line",{x1:"10",x2:"10.01",y1:"16",y2:"16",key:"1l4acy"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wt=l("heart-pulse",[["path",{d:"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",key:"mvr1a0"}],["path",{d:"M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27",key:"auskq0"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jt=l("heart",[["path",{d:"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",key:"mvr1a0"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ea=l("landmark",[["path",{d:"M10 18v-7",key:"wt116b"}],["path",{d:"M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z",key:"1m329m"}],["path",{d:"M14 18v-7",key:"vav6t3"}],["path",{d:"M18 18v-7",key:"aexdmj"}],["path",{d:"M3 22h18",key:"8prr45"}],["path",{d:"M6 18v-7",key:"1ivflk"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ta=l("laptop",[["path",{d:"M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z",key:"1pdavp"}],["path",{d:"M20.054 15.987H3.946",key:"14rxg9"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aa=l("layout-grid",[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sa=l("library",[["path",{d:"m16 6 4 14",key:"ji33uf"}],["path",{d:"M12 6v14",key:"1n7gus"}],["path",{d:"M8 8v12",key:"1gg7y9"}],["path",{d:"M4 4v16",key:"6qkkli"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oa=l("list",[["path",{d:"M3 5h.01",key:"18ugdj"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M3 19h.01",key:"noohij"}],["path",{d:"M8 5h13",key:"1pao27"}],["path",{d:"M8 12h13",key:"1za7za"}],["path",{d:"M8 19h13",key:"m83p4d"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const na=l("music",[["path",{d:"M9 18V5l12-2v13",key:"1jmyc2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["circle",{cx:"18",cy:"16",r:"3",key:"1hluhg"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const la=l("palette",[["path",{d:"M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z",key:"e79jfc"}],["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor",key:"1okk4w"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor",key:"f64h9f"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor",key:"qy21gx"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor",key:"fotxhn"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ra=l("pen-tool",[["path",{d:"M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z",key:"nt11vn"}],["path",{d:"m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18",key:"15qc1e"}],["path",{d:"m2.3 2.3 7.286 7.286",key:"1wuzzi"}],["circle",{cx:"11",cy:"11",r:"2",key:"xmgehs"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ia=l("plane",[["path",{d:"M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z",key:"1v9wt8"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const be=l("plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ca=l("rocket",[["path",{d:"M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z",key:"m3kijz"}],["path",{d:"m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z",key:"1fmvmk"}],["path",{d:"M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0",key:"1f8sc4"}],["path",{d:"M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",key:"qeys4"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const da=l("scale",[["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"m19 8 3 8a5 5 0 0 1-6 0zV7",key:"zcdpyk"}],["path",{d:"M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1",key:"1yorad"}],["path",{d:"m5 8 3 8a5 5 0 0 1-6 0zV7",key:"eua70x"}],["path",{d:"M7 21h10",key:"1b0cd5"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ua=l("scroll",[["path",{d:"M19 17V5a2 2 0 0 0-2-2H4",key:"zz82l3"}],["path",{d:"M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3",key:"1ph1d7"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ha=l("search-check",[["path",{d:"m8 11 2 2 4-4",key:"1sed1v"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ya=l("search-x",[["path",{d:"m13.5 8.5-5 5",key:"1cs55j"}],["path",{d:"m8.5 8.5 5 5",key:"a8mexj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xe=l("search",[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pa=l("settings",[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ga=l("shield",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const va=l("smile",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M8 14s1.5 2 4 2 4-2 4-2",key:"1y1vjs"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9",key:"yxxnd0"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9",key:"1p4y9e"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ka=l("sparkles",[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",key:"1s2grr"}],["path",{d:"M20 2v4",key:"1rf3ol"}],["path",{d:"M22 4h-4",key:"gwowj6"}],["circle",{cx:"4",cy:"20",r:"2",key:"6kqj1y"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ma=l("star",[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fa=l("stethoscope",[["path",{d:"M11 2v2",key:"1539x4"}],["path",{d:"M5 2v2",key:"1yf1q8"}],["path",{d:"M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1",key:"rb5t3r"}],["path",{d:"M8 15a6 6 0 0 0 12 0v-3",key:"x18d4x"}],["circle",{cx:"20",cy:"10",r:"2",key:"ts1r5v"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wa=l("trash-2",[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ma=l("trophy",[["path",{d:"M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978",key:"1n3hpd"}],["path",{d:"M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978",key:"rfe1zi"}],["path",{d:"M18 9h1.5a1 1 0 0 0 0-5H18",key:"7xy6bh"}],["path",{d:"M4 22h16",key:"57wxv0"}],["path",{d:"M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z",key:"1mhfuq"}],["path",{d:"M6 9H4.5a1 1 0 0 1 0-5H6",key:"tex48p"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ba=l("upload",[["path",{d:"M12 3v12",key:"1x0j5s"}],["path",{d:"m17 8-5-5-5 5",key:"7q97r8"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xa=l("user-x",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"17",x2:"22",y1:"8",y2:"13",key:"3nzzx3"}],["line",{x1:"22",x2:"17",y1:"8",y2:"13",key:"1swrse"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ca=l("user",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _a=l("users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const za=l("wand-sparkles",[["path",{d:"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72",key:"ul74o6"}],["path",{d:"m14 7 3 3",key:"1r5n42"}],["path",{d:"M5 6v4",key:"ilb8ba"}],["path",{d:"M19 14v4",key:"blhpug"}],["path",{d:"M10 2v2",key:"7u0qdc"}],["path",{d:"M7 8H3",key:"zfb6yr"}],["path",{d:"M21 16h-4",key:"1cnmox"}],["path",{d:"M11 3H9",key:"1obp7u"}]]);/**
 * @license lucide-vue-next v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z=l("x",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]),Da={class:"home"},Ta={class:"main"},Ea={class:"content-wrapper"},$a={class:"sidebar"},Aa={class:"sidebar-section"},Sa={class:"category-list"},Ba={class:"category-icon"},Va={class:"category-count"},Ha=["onClick"],ja={class:"category-name"},La={class:"category-count"},Ua={class:"category-icon add-icon"},qa={class:"sidebar-bottom"},Pa={class:"sidebar-section"},Ka=["src"],Ia={class:"baidupan-info"},Ra={class:"baidupan-name"},Fa={class:"baidupan-vip"},Na={class:"sidebar-section"},Ya={class:"category-icon"},Za={class:"content"},Xa={key:0,class:"content-header"},Ga={class:"section-info"},Oa={class:"section-title"},Qa={class:"section-subtitle"},Wa={class:"header-controls"},Ja={class:"search-container"},es={class:"search-box"},ts={class:"view-controls"},as={key:1,class:"search-loading"},ss={key:2,class:"search-results-info"},os={class:"search-info-content"},ns={class:"search-info-text"},ls={key:3},rs=["onClick","onContextmenu"],is={class:"book-cover-container"},cs={key:0,class:"book-cover-placeholder"},ds={class:"placeholder-text"},us={class:"book-format-badge"},hs={key:1,class:"book-downloading-overlay"},ys=["onClick","title"],ps={class:"book-info"},gs={class:"book-title"},vs={class:"book-author"},ks={key:0,class:"book-progress"},ms={class:"progress-bar-container"},fs={class:"progress-text"},ws={class:"book-meta"},Ms={class:"book-last-read"},bs={key:0,class:"empty-state"},xs={key:1,class:"empty-state"},Cs={class:"dialog-header"},_s={class:"dialog-body"},zs={class:"category-manage-list"},Ds=["onClick"],Ts={class:"category-manage-name"},Es={class:"dialog-footer"},$s=["disabled"],As={class:"dialog-header"},Ss={class:"dialog-body"},Bs={class:"form-group"},Vs={class:"form-group"},Hs={class:"color-picker-container"},js={class:"color-value"},Ls={class:"dialog-footer"},Us=["disabled"],qs={class:"dialog-header"},Ps={class:"dialog-body"},Ks={class:"form-group"},Is={class:"form-group"},Rs={class:"form-group"},Fs=Ce({__name:"index",setup(y){const u=Ne(),n=De(),r=_e(),v=m("grid"),b=m(null),k=m(""),h=m("all"),z=m(!1),E=m(0),V=m(0),D=m(null),K=m(!1),d=m(""),o=m("#4A90E2"),p=m(!1),x=m(""),ne=m(!1),w=m({appKey:"",secretKey:"",refreshToken:""}),$=m([]),I=m(!1),X=P(()=>n.isBaidupanTokenValid()),G=()=>{ne.value=!1},Te=async()=>{try{if(await n.updateUserConfig({storage:{...n.userConfig.storage,baidupan:{appKey:w.value.appKey,secretKey:w.value.secretKey,refreshToken:w.value.refreshToken,accessToken:"",expiration:0,rootPath:"",userId:"",namingStrategy:"1"}}},!0),w.value.refreshToken&&w.value.appKey&&w.value.secretKey){const s=await oe.refreshToken(w.value.refreshToken,w.value.appKey,w.value.secretKey);!s.error&&s.access_token&&(await n.updateUserConfig({storage:{...n.userConfig.storage,baidupan:{appKey:w.value.appKey,secretKey:w.value.secretKey,refreshToken:s.refresh_token||w.value.refreshToken,accessToken:s.access_token,expiration:Date.now()+s.expires_in*1e3,rootPath:"",userId:"",namingStrategy:"1"}}},!0),await n.fetchBaidupanUserInfo(!0))}G()}catch(s){console.error("保存百度网盘授权信息失败:",s)}},Ee=async s=>{v.value=s,await n.updateUserConfig({ui:{...n.userConfig.ui,viewMode:s}})},R=P(()=>n.books),W=P(()=>(n.categories||[]).filter(s=>s.name!=="未分类")),$e=P(()=>h.value==="all"?R.value:R.value.filter(s=>s.categoryId===h.value)),le=P(()=>k.value&&$.value.length>0?$.value:$e.value),T=m({categoryBooks:{},categoryNames:{},categoryColors:{}}),Ae=async s=>{const t=n.getBookById(s);if(!t){r.showErrorDialog("书籍不存在","无法找到该书籍");return}if(t.storageType==="baidupan"){r.showDialog({title:"需要下载",message:`《${t.title}》尚未下载到本地，是否立即下载？`,type:"info",buttons:[{text:"取消"},{text:"下载",primary:!0,callback:async()=>{try{r.showDialog({title:"正在下载",message:`正在从百度网盘下载《${t.title}》...`,type:"info",buttons:[]});const a=await n.downloadFromBaidupan(t.baidupanPath||t.path);r.closeDialog(),a?(r.showSuccessDialog("下载成功","即将打开阅读器"),await new Promise(M=>setTimeout(M,500)),u.push(`/reader/${s}`)):r.showErrorDialog("下载失败","请检查网络连接或授权状态")}catch(a){r.closeDialog(),console.error("下载失败:",a);const M=a instanceof Error?a.message:"下载失败，请重试";r.showErrorDialog("下载失败",M)}}}]});return}u.push(`/reader/${s}`)},re=()=>{b.value&&b.value.click()},Se=async s=>{var A;const a=(A=s.target.files)==null?void 0:A[0];if(!a)return;const M=a.name.toLowerCase().split(".").pop();if(!["epub","pdf","txt"].includes(M||"")){r.showErrorDialog("不支持的文件格式","仅支持 EPUB、PDF 和 TXT 格式的电子书");return}try{r.showDialog({title:"正在导入",message:`正在导入 ${a.name} ...`,type:"info",buttons:[]}),await n.importEbookFile(a)?(r.closeDialog(),r.showSuccessDialog("导入成功")):(r.closeDialog(),r.showErrorDialog("导入失败","无法导入所选文件"))}catch(N){r.closeDialog(),console.error("导入文件失败:",N),r.showErrorDialog("导入失败",N instanceof Error?N.message:String(N))}finally{b.value&&(b.value.value="")}},Be=s=>Ye(s).format("YYYY-MM-DD HH:mm"),Ve=(s,t)=>{s.preventDefault(),z.value=!0,E.value=s.clientX,V.value=s.clientY,D.value=t,document.addEventListener("click",J)},U=(s=!0)=>{z.value=!1,s&&(D.value=null)},J=s=>{U(),document.removeEventListener("click",J)},He=async s=>{if(!s)return;const t=s;U(),await de(t)},je=s=>{if(!s)return;const t=s.id,a=s.title,M=s.storageType;r.showDialog({title:"确认删除",message:`确定要删除《${a}》吗？`,type:"warning",buttons:[{text:"取消"},{text:"删除",primary:!0,callback:async()=>{console.log("开始执行删除逻辑, ID:",t);try{await n.removeBook(t,M)?r.showSuccessDialog("书籍删除成功"):r.showErrorDialog("删除失败","无法删除指定书籍")}catch(A){console.error("删除过程报错:",A),r.showErrorDialog("删除失败",A instanceof Error?A.message:String(A))}}}]}),U()},Le=async()=>{if(!D.value||!x.value){console.error("selectedBook 或 selectedCategoryId 为 null，无法移动书籍");return}const s=D.value,t=x.value;console.log("移动书籍到分类:",s.title,"->",t),console.log("selectedBook:",D.value);try{console.log("调用 ebookStore.addBookToCategory");const a=await n.addBookToCategory(s.id,t);console.log("addBookToCategory 返回结果:",a),a?(r.showSuccessDialog("书籍分类更新成功"),F(),console.log("书籍分类更新成功，对话框已关闭")):(r.showErrorDialog("分类更新失败","无法找到指定书籍或分类"),console.log("书籍分类更新失败，对话框已关闭"))}catch(a){console.error("移动书籍到分类失败:",a),r.showErrorDialog("分类更新失败",a instanceof Error?a.message:String(a)),F()}},Ue=()=>{K.value=!0,d.value="",o.value="#4A90E2",U()},O=()=>{K.value=!1,d.value=""},qe=()=>{p.value=!0,document.removeEventListener("click",J),U(!1)},F=()=>{p.value=!1,x.value="",D.value=null,U()},ie=async()=>{if(d.value.trim()){console.log("开始创建分类，名称:",d.value.trim(),"颜色:",o.value);try{const s=await n.addCategory(d.value.trim(),o.value);console.log("分类创建成功，返回结果:",s),await new Promise(t=>setTimeout(t,100)),console.log("当前分类列表:",n.categories),console.log("分类数量:",n.categories.length),r.showSuccessDialog("分类创建成功"),O()}catch(s){console.error("添加分类失败:",s),r.showErrorDialog("分类创建失败",s instanceof Error?s.message:String(s))}}},ce=async()=>{if(!k.value.trim()){ee();return}I.value=!0;try{const s=await n.searchBooks(k.value.trim());$.value=s}catch(s){console.error("搜索失败:",s),r.showErrorDialog("搜索失败",s instanceof Error?s.message:String(s)),$.value=[]}finally{I.value=!1}},ee=()=>{k.value="",$.value=[]},Pe=s=>({local:"本地存储",synced:"已同步到云端",baidupan:"点击下载到本地"})[s]||"未知",Ke=async s=>{if(s.storageType==="baidupan")try{r.showDialog({title:"正在下载",message:`正在从百度网盘下载《${s.title}》...`,type:"info",buttons:[]});const t=await n.downloadFromBaidupan(s.baidupanPath||s.path);r.closeDialog(),t?r.showSuccessDialog("下载成功"):r.showErrorDialog("下载失败","请检查网络连接或授权状态")}catch(t){r.closeDialog(),console.error("下载失败:",t);const a=t instanceof Error?t.message:"下载失败，请重试";r.showErrorDialog("下载失败",a)}else s.storageType==="local"&&await de(s)},de=async s=>{if(!X.value){r.showErrorDialog("未授权","请先授权百度网盘");return}try{r.showDialog({title:"正在上传",message:`正在上传《${s.title}》到百度网盘...`,type:"info",buttons:[]});const t=await n.uploadToBaidupan(s.id);r.closeDialog(),t?r.showSuccessDialog("上传成功"):r.showErrorDialog("上传失败","请检查网络连接或授权状态")}catch(t){r.closeDialog(),console.error("上传失败:",t);const a=t instanceof Error?t.message:"上传失败，请重试";r.showErrorDialog("上传失败",a)}},ue=s=>{if(T.value.categoryNames[s])return T.value.categoryNames[s];const t=n.categories.find(M=>M.id===s),a=t?t.name:"未分类";return T.value.categoryNames[s]=a,a},he=s=>{if(T.value.categoryColors[s])return T.value.categoryColors[s];const t=n.categories.find(M=>M.id===s),a=t?t.color:"#4A90E2";return T.value.categoryColors[s]=a,a},ye=s=>({技术:Kt,小说:we,历史:ua,哲学:$t,科学:Yt,艺术:la,健康:Wt,经济:Tt,军事:ga,心理:Et,教育:Ot,计算机:ta,编程:Pt,医学:fa,烹饪:jt,旅行:ia,体育:Ma,音乐:na,电影:Ft,摄影:Bt,设计:ra,商业:At,金融:Ht,法律:da,政治:ea,宗教:Lt,文学:Rt,传记:Ca,科幻:ca,奇幻:za,悬疑:xe,爱情:Jt,恐怖:Xt,儿童:va,青春:Zt,职场:_a,励志:ka,经典:ma,现代:St,古代:Vt,外国:Gt,中国:Nt})[s]||Me,Ie=s=>ye(s),pe=s=>{if(T.value.categoryBooks[s])return T.value.categoryBooks[s];const t=n.books.filter(a=>a.categoryId===s);return T.value.categoryBooks[s]=t,t};ge([()=>R.value.length,()=>W.value.length],()=>{T.value={categoryBooks:{},categoryNames:{},categoryColors:{}}}),Fe(async()=>{try{console.log("首页加载，开始初始化电子书存储..."),await n.initialize(),X.value&&!n.baidupanUser&&await n.fetchBaidupanUserInfo(),Re()}catch(s){console.error("初始化电子书存储失败:",s)}});const Re=()=>{n.userConfig.reader.theme==="dark"?document.documentElement.classList.add("theme-dark"):document.documentElement.classList.remove("theme-dark")};return ge(()=>n.userConfig.reader.theme,s=>{s==="dark"?document.documentElement.classList.add("theme-dark"):document.documentElement.classList.remove("theme-dark")}),(s,t)=>(i(),c("div",Da,[e("main",Ta,[e("div",Ea,[e("aside",$a,[t[23]||(t[23]=e("div",{class:"sidebar-header"},[e("div",{class:"logo"},[e("img",{src:Ze,alt:"Logo",class:"logo-icon",style:{width:"48px",height:"48px"}}),e("h1",{class:"logo-text"},"Reader")])],-1)),e("div",Aa,[t[20]||(t[20]=e("h3",{class:"sidebar-title"},"书架",-1)),e("div",Sa,[e("button",{class:_(["category-item",{active:h.value==="all"}]),onClick:t[0]||(t[0]=a=>h.value="all")},[e("span",Ba,[f(sa,{size:20})]),t[18]||(t[18]=e("span",{class:"category-name"},"全部书籍",-1)),e("span",Va,g(R.value.length),1)],2),(i(!0),c(te,null,ae(W.value,a=>(i(),c("button",{key:a.id,class:_(["category-item",{active:h.value===a.id}]),style:S({"--category-color":a.color}),onClick:M=>h.value=a.id},[e("span",{class:"category-icon",style:S({backgroundColor:a.color+"20",color:a.color})},[(i(),q(ke(ye(a.name)),{size:20}))],4),e("span",ja,g(a.name),1),e("span",La,g(pe(a.id).length),1)],14,Ha))),128)),e("button",{class:"category-item add-category",onClick:Ue},[e("span",Ua,[f(be,{size:20})]),t[19]||(t[19]=e("span",{class:"category-name"},"新建分类",-1))])])]),e("div",qa,[e("div",Pa,[X.value&&B(n).baidupanUser?(i(),c("div",{key:0,class:"baidupan-status",onClick:t[1]||(t[1]=a=>h.value="settings")},[e("img",{src:B(n).baidupanUser.avatar_url,class:"baidupan-avatar",alt:"头像"},null,8,Ka),e("div",Ia,[e("span",Ra,g(B(n).baidupanUser.baidu_name),1),e("span",Fa,g(B(n).baidupanUser.vip_type===2?"超级会员":B(n).baidupanUser.vip_type===1?"普通会员":"普通用户"),1)])])):X.value?C("",!0):(i(),c("div",{key:1,class:"baidupan-status unauthorized",onClick:t[2]||(t[2]=a=>h.value="settings")},[f(xa,{size:20}),t[21]||(t[21]=e("span",{class:"baidupan-text"},"未授权",-1))]))]),e("div",Na,[e("button",{class:_(["category-item",{active:h.value==="settings"}]),onClick:t[3]||(t[3]=a=>h.value="settings")},[e("span",Ya,[f(pa,{size:20})]),t[22]||(t[22]=e("span",{class:"category-name"},"设置",-1))],2)])])]),e("section",Za,[h.value!=="settings"?(i(),c("div",Xa,[e("div",Ga,[e("h2",Oa,g(h.value==="all"?"我的书架":ue(h.value)),1),e("p",Qa,g(h.value==="all"?`共 ${R.value.length} 本书籍`:`共 ${pe(h.value).length} 本`),1)]),e("div",Wa,[e("div",Ja,[e("div",es,[j(e("input",{type:"text","onUpdate:modelValue":t[4]||(t[4]=a=>k.value=a),placeholder:"输入书名、作者",class:"search-input",onKeyup:ve(ce,["enter"])},null,544),[[L,k.value]]),e("button",{class:"search-btn",onClick:ce},[f(xe,{size:18})])])]),e("div",ts,[e("button",{class:_(["view-btn",{active:v.value==="grid"}]),onClick:t[5]||(t[5]=a=>v.value="grid")},[f(aa,{size:16}),t[24]||(t[24]=Q(" 网格 ",-1))],2),e("button",{class:_(["view-btn",{active:v.value==="list"}]),onClick:t[6]||(t[6]=a=>v.value="list")},[f(oa,{size:16}),t[25]||(t[25]=Q(" 列表 ",-1))],2)])])])):C("",!0),I.value&&h.value!=="settings"?(i(),c("div",as,[...t[26]||(t[26]=[e("div",{class:"loading-spinner"},null,-1),e("p",null,"正在搜索...",-1)])])):$.value.length>0&&k.value&&h.value!=="settings"?(i(),c("div",ss,[e("div",os,[f(ha,{size:24,class:"search-info-icon"}),e("div",ns,[t[27]||(t[27]=e("h3",null,"搜索结果",-1)),e("p",null,"找到 "+g($.value.length)+" 个结果，关键词: "+g(k.value),1)]),e("button",{class:"clear-search-btn",onClick:ee},[f(Z,{size:16})])])])):C("",!0),h.value!=="settings"?(i(),c("div",ls,[e("div",{class:_(v.value==="grid"?"books-grid":"books-list")},[(i(!0),c(te,null,ae(le.value,a=>(i(),c("div",{key:a.id,class:_(["book-card",{"has-progress":a.readingProgress>0}]),onClick:M=>Ae(a.id),onContextmenu:H(M=>Ve(M,a),["prevent"])},[e("div",is,[e("div",{class:"book-cover",style:S({backgroundImage:a.cover?`url(${a.cover})`:"none"})},[a.cover?C("",!0):(i(),c("div",cs,[t[28]||(t[28]=e("span",{class:"placeholder-icon"},"📚",-1)),e("span",ds,g(a.title.charAt(0)),1)])),e("div",us,g(a.format.toUpperCase()),1),a.downloading?(i(),c("div",hs,[...t[29]||(t[29]=[e("div",{class:"downloading-spinner"},null,-1),e("span",{class:"downloading-text"},"下载中...",-1)])])):(i(),c("div",{key:2,class:_(["book-storage-badge",{local:a.storageType==="local",synced:a.storageType==="synced",baidupan:a.storageType==="baidupan"}]),onClick:H(M=>Ke(a),["stop"]),title:Pe(a.storageType)},[a.storageType==="local"?(i(),q(Qt,{key:0,size:14})):a.storageType==="synced"?(i(),q(qt,{key:1,size:14})):a.storageType==="baidupan"?(i(),q(It,{key:2,size:14})):C("",!0)],10,ys))],4)]),e("div",ps,[e("h3",gs,g(a.title),1),e("p",vs,g(a.author||"未知作者"),1),a.readingProgress>0?(i(),c("div",ks,[e("div",ms,[e("div",{class:"progress-bar",style:S({width:`${a.readingProgress}%`})},null,4)]),e("span",fs,g(a.readingProgress)+"%",1)])):C("",!0),e("div",ws,[e("span",Ms,g(Be(a.lastRead)),1),a.categoryId?(i(),c("span",{key:0,class:"book-category",style:S({backgroundColor:he(a.categoryId)+"20",color:he(a.categoryId)})},g(ue(a.categoryId)),5)):C("",!0)])])],42,rs))),128))],2),le.value.length===0&&!I.value&&h.value!=="settings"?(i(),c("div",bs,[f(we,{size:64,class:"empty-icon"}),e("h3",null,g(h.value==="all"?"书架是空的":"该分类下没有书籍"),1),e("p",null,g(h.value==="all"?"添加一些电子书开始阅读吧":"点击左侧添加书籍"),1),e("button",{class:"btn btn-primary add-books-btn",onClick:re},[f(ba,{size:16}),t[30]||(t[30]=Q(" 添加书籍 ",-1))])])):C("",!0),$.value.length===0&&k.value&&!I.value&&h.value!=="settings"?(i(),c("div",xs,[f(ya,{size:64,class:"empty-icon"}),t[32]||(t[32]=e("h3",null,"没有找到匹配的书籍",-1)),t[33]||(t[33]=e("p",null,"尝试其他关键词或检查拼写",-1)),e("button",{class:"btn btn-secondary",onClick:ee},[f(Z,{size:16}),t[31]||(t[31]=Q(" 清除搜索 ",-1))])])):C("",!0)])):h.value==="settings"?(i(),q(bt,{key:4,"baidupan-user":B(n).baidupanUser,"view-mode":v.value,onUpdateViewMode:Ee},null,8,["baidupan-user","view-mode"])):C("",!0)])])]),h.value!=="settings"?(i(),c("button",{key:0,class:"floating-add-btn",onClick:re},[f(be,{size:24})])):C("",!0),e("input",{type:"file",ref_key:"fileInputRef",ref:b,onChange:Se,style:{display:"none"},accept:".epub,.pdf,.txt"},null,544),z.value?(i(),c("div",{key:1,class:"context-menu",style:S({left:E.value+"px",top:V.value+"px"}),onContextmenu:t[9]||(t[9]=H(()=>{},["prevent"]))},[e("div",{class:"menu-item",onClick:t[7]||(t[7]=a=>He(D.value))},[f(Ut,{size:18,class:"menu-icon"}),t[34]||(t[34]=e("span",{class:"menu-text"},"上传到百度网盘",-1))]),e("div",{class:"menu-item",onClick:H(qe,["stop"])},[f(Me,{size:18,class:"menu-icon"}),t[35]||(t[35]=e("span",{class:"menu-text"},"分类管理",-1))]),e("div",{class:"menu-item danger",onClick:t[8]||(t[8]=a=>je(D.value))},[f(wa,{size:18,class:"menu-icon"}),t[36]||(t[36]=e("span",{class:"menu-text"},"删除书籍",-1))])],36)):C("",!0),p.value?(i(),c("div",{key:2,class:"dialog-overlay",onClick:F},[e("div",{class:"dialog-content",onClick:t[10]||(t[10]=H(()=>{},["stop"]))},[e("div",Cs,[t[37]||(t[37]=e("h3",{class:"dialog-title"},"分类管理",-1)),e("button",{class:"dialog-close",onClick:F},[f(Z,{size:20})])]),e("div",_s,[e("div",zs,[(i(!0),c(te,null,ae(W.value,a=>(i(),c("div",{key:a.id,class:_(["category-manage-item",{selected:x.value===a.id}]),onClick:M=>x.value=a.id},[e("span",{class:"category-manage-icon",style:S({backgroundColor:a.color+"20",color:a.color})},[(i(),q(ke(Ie(a.name)),{size:18}))],4),e("span",Ts,g(a.name),1)],10,Ds))),128))])]),e("div",Es,[e("button",{class:"btn btn-secondary",onClick:F},"取消"),e("button",{class:"btn btn-primary",onClick:Le,disabled:!x.value}," 确定 ",8,$s)])])])):C("",!0),K.value?(i(),c("div",{key:3,class:"dialog-overlay",onClick:O},[e("div",{class:"dialog-content",onClick:t[13]||(t[13]=H(()=>{},["stop"]))},[e("div",As,[t[38]||(t[38]=e("h3",{class:"dialog-title"},"新建分类",-1)),e("button",{class:"dialog-close",onClick:O},[f(Z,{size:20})])]),e("div",Ss,[e("div",Bs,[t[39]||(t[39]=e("label",{class:"form-label"},"分类名称",-1)),j(e("input",{type:"text","onUpdate:modelValue":t[11]||(t[11]=a=>d.value=a),placeholder:"输入分类名称",class:"form-input",onKeyup:ve(ie,["enter"])},null,544),[[L,d.value]])]),e("div",Vs,[t[40]||(t[40]=e("label",{class:"form-label"},"分类颜色",-1)),e("div",Hs,[j(e("input",{type:"color","onUpdate:modelValue":t[12]||(t[12]=a=>o.value=a),class:"color-picker"},null,512),[[L,o.value]]),e("span",{class:"color-preview",style:S({backgroundColor:o.value})},null,4),e("span",js,g(o.value),1)])])]),e("div",Ls,[e("button",{class:"btn btn-secondary",onClick:O},"取消"),e("button",{class:"btn btn-primary",onClick:ie,disabled:!d.value.trim()},"创建",8,Us)])])])):C("",!0),ne.value?(i(),c("div",{key:4,class:"dialog-overlay",onClick:G},[e("div",{class:"dialog-content",onClick:t[17]||(t[17]=H(()=>{},["stop"]))},[e("div",qs,[t[41]||(t[41]=e("h3",{class:"dialog-title"},"百度网盘授权",-1)),e("button",{class:"dialog-close",onClick:G},[f(Z,{size:20})])]),e("div",Ps,[e("div",Ks,[t[42]||(t[42]=e("label",{class:"form-label"},"App Key",-1)),j(e("input",{type:"text","onUpdate:modelValue":t[14]||(t[14]=a=>w.value.appKey=a),placeholder:"输入百度网盘 App Key",class:"form-input"},null,512),[[L,w.value.appKey]])]),e("div",Is,[t[43]||(t[43]=e("label",{class:"form-label"},"Secret Key",-1)),j(e("input",{type:"password","onUpdate:modelValue":t[15]||(t[15]=a=>w.value.secretKey=a),placeholder:"输入百度网盘 Secret Key",class:"form-input"},null,512),[[L,w.value.secretKey]])]),e("div",Rs,[t[44]||(t[44]=e("label",{class:"form-label"},"Refresh Token",-1)),j(e("input",{type:"password","onUpdate:modelValue":t[16]||(t[16]=a=>w.value.refreshToken=a),placeholder:"输入百度网盘 Refresh Token",class:"form-input"},null,512),[[L,w.value.refreshToken]])])]),e("div",{class:"dialog-footer"},[e("button",{class:"btn btn-secondary",onClick:G},"取消"),e("button",{class:"btn btn-primary",onClick:Te},"保存")])])])):C("",!0)]))}}),Xs=ze(Fs,[["__scopeId","data-v-0b973efa"]]);export{Xs as default};
