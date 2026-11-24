import { Article } from "@/components/Article";
import ref from "../../../../data/lnmu-reference.json";

export const metadata = { title: "LNMU internship guide" };
type R = Record<string, Record<string, string>[]>;

export default function Lnmu() {
  const r = ref as R;
  return (
    <Article title="LNMU UG internship guide" lead="Summary of the published LNMU undergraduate internship rules that this platform is designed to support. Always confirm with your college — the university's notification prevails.">
      <h2>Rules</h2>
      <div className="not-prose overflow-x-auto"><table className="table card p-0"><tbody>{r["LNMU Internship Rules"].map((x) => <tr key={x["Rule Area"]}><th className="w-48 normal-case">{x["Rule Area"]}</th><td>{x["Published LNMU Guideline / Operational Requirement"]}</td></tr>)}</tbody></table></div>
      <h2>Degree → pathway mapping</h2>
      <ul>{r["LNMU Degree Mapping"].map((x) => <li key={x["Degree / Subject Group"]}><strong>{x["Degree / Subject Group"]}:</strong> {x["Recommended Internship Pathways"]}</li>)}</ul>
      <h2>Required documents (Annexures)</h2>
      <p>Annexure I — Student consent letter · Annexure II — Internship acceptance letter · Annexure III — IPO completion certificate · Annexure IV — Department certificate · Annexure V — Report cover page. Templates for all annexures are available in the platform&apos;s document studio and are generated from your verified records.</p>
      <h2>Sources</h2>
      <ul>{r["Sources & Evidence"].map((x) => <li key={x["Source"]}>{x["URL"] ? <a className="link" href={x["URL"]} target="_blank" rel="noreferrer">{x["Source"]}</a> : x["Source"]} — {x["What it supports / limitation"]}</li>)}</ul>
      <p className="text-sm">InternVerse is an independent platform. No affiliation with or approval by LNMU is claimed unless a verified MoU is displayed on the college/partner page.</p>
    </Article>
  );
}
