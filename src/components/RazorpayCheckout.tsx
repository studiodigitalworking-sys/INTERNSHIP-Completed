"use client";
import { useState } from "react";

declare global { interface Window { Razorpay?: new (o: object) => { open: () => void } } }

/** Opens Razorpay Checkout. The browser callback is NOT trusted — activation happens via the signed webhook. */
export function RazorpayCheckout(p: { keyId: string; orderId: string; amount: number; name: string; email: string; phone: string }) {
  const [msg, setMsg] = useState("");
  const open = async () => {
    if (!window.Razorpay) {
      await new Promise<void>((res, rej) => { const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.onload = () => res(); s.onerror = () => rej(); document.body.appendChild(s); }).catch(() => setMsg("Could not load the payment gateway. Check your connection and retry."));
    }
    if (!window.Razorpay) return;
    new window.Razorpay({
      key: p.keyId, order_id: p.orderId, amount: p.amount, currency: "INR", name: "InternVerse", prefill: { name: p.name, email: p.email, contact: p.phone },
      handler: () => { setMsg("Payment submitted. Waiting for gateway confirmation…"); setTimeout(() => (window.location.href = "/dashboard/payments"), 4000); },
      modal: { ondismiss: () => setMsg("Payment window closed. You can retry anytime.") },
    }).open();
  };
  return <div className="mt-4"><button onClick={open} className="btn-accent w-full">Pay securely with Razorpay</button>{msg && <p className="mt-2 text-sm text-slate-600" role="status">{msg}</p>}</div>;
}
