import { api, backendConfig, getAccessToken, requireUser } from "../core/backend.js";
let socketClient = null;
let socketLoading = null;

function uuid(value) {
  const id = String(value || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error("Mã dữ liệu không hợp lệ.");
  return id;
}
function mapConversation(c) {
  return { id:c.id, listing_id:c.listingId, buyer_id:c.buyerId, seller_id:c.sellerId, updated_at:c.updatedAt, listings:c.listing ? { id:c.listing.id, title:c.listing.title, status:String(c.listing.status||"").toLowerCase(), price_vnd:Number(c.listing.priceVnd||0) } : null };
}
function mapMessage(m) { return { id:m.id, conversation_id:m.conversationId, sender_id:m.senderId, body:m.body, created_at:m.createdAt, read_at:m.readAt }; }
function apiOrigin() { const cfg=backendConfig(); if(!cfg.configured) throw new Error("Backend chưa được cấu hình."); return new URL(cfg.apiBaseUrl, location.href).origin; }
async function loadSocketBundle() {
  if (window.io) return window.io;
  if (socketLoading) return socketLoading;
  socketLoading = new Promise((resolve,reject)=>{const script=document.createElement("script");script.src=`${apiOrigin()}/socket.io/socket.io.js`;script.async=true;script.crossOrigin="anonymous";script.onload=()=>window.io?resolve(window.io):reject(new Error("Không tải được realtime client."));script.onerror=()=>reject(new Error("Không kết nối được realtime backend."));document.head.appendChild(script);}).finally(()=>{socketLoading=null;});
  return socketLoading;
}
async function getSocket() {
  await requireUser();
  if (socketClient?.connected) return socketClient;
  const io = await loadSocketBundle();
  const token = await getAccessToken();
  socketClient = io(`${apiOrigin()}/chat`, { auth:{token}, withCredentials:true, transports:["websocket","polling"], reconnection:true, reconnectionAttempts:8 });
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("Kết nối chat quá thời gian.")),8000);socketClient.once("connect",()=>{clearTimeout(timer);resolve();});socketClient.once("connect_error",err=>{clearTimeout(timer);reject(err);});});
  return socketClient;
}
export async function startConversation(listingId) { await requireUser(); return mapConversation(await api(`/conversations/from-listing/${uuid(listingId)}`,{method:"POST",auth:true})); }
export async function listConversations() { await requireUser(); const rows=await api("/conversations",{auth:true}); return (rows||[]).map(mapConversation); }
export async function getConversation(conversationId) { await requireUser(); return mapConversation(await api(`/conversations/${uuid(conversationId)}`,{auth:true})); }
export async function getMessages(conversationId,limit=100) { await requireUser(); const rows=await api(`/conversations/${uuid(conversationId)}/messages?limit=${Math.min(Math.max(Number(limit)||100,1),200)}`,{auth:true}); return (rows||[]).map(mapMessage); }
export async function sendMessage(conversationId,body) { const id=uuid(conversationId); const text=String(body||"").trim(); if(!text||text.length>3000)throw new Error("Tin nhắn phải có từ 1 đến 3000 ký tự."); const socket=await getSocket(); return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("Gửi tin nhắn quá thời gian.")),8000);socket.emit("send_message",{conversationId:id,body:text},ack=>{clearTimeout(timer);if(ack?.ok)resolve(ack);else reject(new Error(ack?.message||"Không gửi được tin nhắn."));});}); }
export async function subscribeMessages(conversationId,onMessage) { const id=uuid(conversationId); const socket=await getSocket(); const handler=message=>{if(message?.conversationId===id)onMessage?.(mapMessage(message));}; socket.on("message:new",handler); await new Promise((resolve,reject)=>{socket.emit("join_conversation",{conversationId:id},ack=>ack?.ok?resolve():reject(new Error(ack?.message||"Không vào được cuộc trò chuyện.")));}); return ()=>socket.off("message:new",handler); }
