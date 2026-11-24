import { Article } from "@/components/Article";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "About" };
export const dynamic = "force-dynamic";

export default async function About() {
  const s = await getSettings();
  return (
    <Article title="About InternVerse" lead="Learn · Build · Work · Get certified · Get hired.">
      <p>InternVerse is an internship, training and skill-development platform focused on students of Mithila and North Bihar — Darbhanga, Madhubani, Sitamarhi/Pupri, Samastipur and beyond — with local sector clusters such as makhana, fisheries, dairy, Mithila art and heritage, agriculture and tourism alongside digital and professional skills.</p>
      <h2>Our principles</h2>
      <ul><li>Evidence before certificates — no completion without recorded work.</li><li>No false claims — we never claim government, UGC, AICTE or university approval we do not hold.</li><li>Privacy by design — minimum data, consent, and access logging.</li><li>Bilingual — English and Hindi, with Maithili planned.</li></ul>
      <h2>Legal entity</h2>
      <p>{s["org.legalName"] ? `${s["org.legalName"]}${s["org.registration"] ? ` · CIN/Reg: ${s["org.registration"]}` : ""}${s["org.gstin"] ? ` · GSTIN: ${s["org.gstin"]}` : ""}` : "Legal entity details will be displayed here once configured and verified by the owner."}</p>
      {s["org.address"] && <p>Registered office: {s["org.address"]}</p>}
    </Article>
  );
}
