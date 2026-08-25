"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AdminHeader from "@/app/components/AdminHeader";
import type { AdminRole } from "@/lib/admin-types";
import type { Service } from "@/lib/data";

type PairDraft = { serviceId: string; footwearType: string; brand: string; specialRequest: string };

type Props = { services: Service[]; name: string; role: AdminRole };

function newPair(services: Service[]): PairDraft {
  return { serviceId: services[0]?.id ?? "", footwearType: "Sneakers", brand: "", specialRequest: "" };
}

export default function CounterBookingForm({ services, name, role }: Props) {
  const [pairs, setPairs] = useState<PairDraft[]>([newPair(services)]);
  const [method, setMethod] = useState<"self_dropoff" | "pickup_delivery">("self_dropoff");
  const [message, setMessage] = useState<string | null>(null);
  const [createdReference, setCreatedReference] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updatePair(index: number, field: keyof PairDraft, value: string) {
    setPairs((current) => current.map((pair, pairIndex) => pairIndex === index ? { ...pair, [field]: value } : pair));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage(null);
    setCreatedReference(null);
    try {
      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName: form.get("customerName"),
          phone: form.get("phone"),
          email: form.get("email"),
          preferredDate: form.get("preferredDate"),
          fulfillmentMethod: method,
          pickupArea: method === "pickup_delivery" ? form.get("pickupArea") : "",
          pickupAddress: method === "pickup_delivery" ? form.get("pickupAddress") : "",
          locationUrl: method === "pickup_delivery" ? form.get("locationUrl") : "",
          notes: form.get("notes"),
          expressRequested: form.get("expressRequested") === "on",
          website: "",
          items: pairs,
        }),
      });
      const result = (await response.json()) as { booking?: { publicReference?: string | null }; message?: string };
      if (!response.ok || !result.booking) throw new Error(result.message || "Unable to save the counter booking.");
      setCreatedReference(result.booking.publicReference ?? null);
      setMessage("Counter booking saved. Pricing and delivery were calculated by the server.");
      event.currentTarget.reset();
      setPairs([newPair(services)]);
      setMethod("self_dropoff");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to save the counter booking.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-shell admin-management-shell">
      <AdminHeader name={name} role={role} backLabel="Bookings" />
      <section className="admin-welcome admin-welcome--compact">
        <div><p className="section-kicker">Authenticated operations</p><h1>COUNTER<br />BOOKING.</h1><p>This creates an admin-attributed booking. The service, delivery, multi-pair, and Hetauda rules remain server-calculated.</p></div>
      </section>
      {message ? <p className="admin-notice" role="status">{message}</p> : null}
      {createdReference ? <p className="admin-notice"><span>Reference: <strong>{createdReference}</strong></span><Link href="/admin">Back to bookings</Link></p> : null}
      <section className="admin-panel">
        <form className="admin-form-grid" onSubmit={submit}>
          <label><span>Customer name</span><input name="customerName" minLength={2} maxLength={80} required /></label>
          <label><span>Phone / WhatsApp</span><input name="phone" maxLength={30} required /></label>
          <label><span>Email (optional)</span><input name="email" type="email" maxLength={120} /></label>
          <label><span>Preferred date</span><input name="preferredDate" type="date" /></label>
          <fieldset className="admin-fieldset full-field"><legend>Collection method</legend><label className="admin-inline-choice"><input type="radio" checked={method === "self_dropoff"} onChange={() => setMethod("self_dropoff")} /> Self drop-off & pickup</label><label className="admin-inline-choice"><input type="radio" checked={method === "pickup_delivery"} onChange={() => setMethod("pickup_delivery")} /> Pickup & delivery</label></fieldset>
          {method === "pickup_delivery" ? <><label><span>Pickup area</span><select name="pickupArea" defaultValue="hetauda_city"><option value="hetauda_city">Hetauda City</option><option value="other_city">Other city</option></select></label><label><span>Pickup address</span><input name="pickupAddress" maxLength={300} required /></label><label className="full-field"><span>Map link (optional)</span><input name="locationUrl" type="url" maxLength={500} placeholder="https://" /></label></> : null}
          <section className="admin-pair-editor full-field"><div className="admin-panel-heading"><div><p className="section-kicker">Pairs</p><h2>Each shoe pair</h2></div><button className="admin-secondary" type="button" disabled={pairs.length >= 20} onClick={() => setPairs((current) => [...current, newPair(services)])}>+ Add pair</button></div>{pairs.map((pair, index) => <div className="admin-pair-row" key={index}><strong>Pair {index + 1}</strong><select value={pair.serviceId} onChange={(event) => updatePair(index, "serviceId", event.target.value)} required>{services.map((service) => <option value={service.id} key={service.id}>{service.name} — {service.priceLabel}</option>)}</select><input value={pair.footwearType} maxLength={80} aria-label={`Pair ${index + 1} footwear type`} onChange={(event) => updatePair(index, "footwearType", event.target.value)} required /><input value={pair.brand} maxLength={80} aria-label={`Pair ${index + 1} brand`} placeholder="Brand (optional)" onChange={(event) => updatePair(index, "brand", event.target.value)} /><input value={pair.specialRequest} maxLength={800} aria-label={`Pair ${index + 1} request`} placeholder="Condition / request" onChange={(event) => updatePair(index, "specialRequest", event.target.value)} />{pairs.length > 1 ? <button className="admin-secondary" type="button" onClick={() => setPairs((current) => current.filter((_, pairIndex) => pairIndex !== index))}>Remove</button> : null}</div>)}</section>
          <label className="full-field"><span>Operational booking note (optional)</span><textarea name="notes" rows={3} maxLength={800} /></label>
          <label className="admin-inline-choice full-field"><input name="expressRequested" type="checkbox" /> Request express handling when available</label>
          <div className="modal-actions full-field"><button className="admin-primary" type="submit" disabled={busy || services.length === 0}>{busy ? "Saving…" : "Save counter booking"}</button></div>
        </form>
      </section>
    </main>
  );
}
