import { api, requireUser } from "../core/backend.js";

function uuid(value){const id=String(value||"").trim();if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw new Error("Mã dữ liệu không hợp lệ.");return id;}

export async function listSellerReviews(sellerId,{limit=20}={}){return api(`/reviews/seller/${uuid(sellerId)}?limit=${Math.min(Math.max(Number(limit)||20,1),50)}`,{auth:false});}
export async function reviewEligibility(listingId){await requireUser();return api(`/reviews/listing/${uuid(listingId)}/eligibility`,{auth:true});}
export async function createSellerReview(listingId,{rating,comment=""}){await requireUser();return api(`/reviews/listing/${uuid(listingId)}`,{method:"POST",auth:true,body:{rating:Number(rating),comment:String(comment||"").trim()}});}

export async function listSavedSearches(){await requireUser();return api("/saved-searches",{auth:true});}
export async function createSavedSearch(filters){await requireUser();return api("/saved-searches",{method:"POST",auth:true,body:{name:filters.name||undefined,query:filters.query||undefined,brandSlug:filters.brandSlug||undefined,modelSlug:filters.modelSlug||undefined,minPriceVnd:filters.minPriceVnd==null?undefined:Number(filters.minPriceVnd),maxPriceVnd:filters.maxPriceVnd==null?undefined:Number(filters.maxPriceVnd),province:filters.province||undefined,condition:filters.condition||undefined,notifyEnabled:Boolean(filters.notifyEnabled)}});}
export async function updateSavedSearch(id,patch){await requireUser();return api(`/saved-searches/${uuid(id)}`,{method:"PATCH",auth:true,body:patch});}
export async function deleteSavedSearch(id){await requireUser();return api(`/saved-searches/${uuid(id)}`,{method:"DELETE",auth:true});}

export async function listNotifications({limit=30}={}){await requireUser();return api(`/notifications?limit=${Math.min(Math.max(Number(limit)||30,1),100)}`,{auth:true});}
export async function markNotificationRead(id){await requireUser();return api(`/notifications/${uuid(id)}/read`,{method:"POST",auth:true});}
export async function markAllNotificationsRead(){await requireUser();return api("/notifications/read-all",{method:"POST",auth:true});}
