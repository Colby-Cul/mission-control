import { useState, useEffect, useCallback, useRef } from "react";
import { Card, KPI, Badge, Table } from "../components/shared";
import { C } from "../data/constants";
import entityData from "../data/entity-data.json";

const DOC_TYPES = [
  { value: "operating_agreement", label: "Operating Agreement" },
  { value: "articles_of_incorporation", label: "Articles of Incorporation" },
  { value: "partnership_agreement", label: "Partnership Agreement" },
  { value: "trust_document", label: "Trust Document" },
  { value: "amendment", label: "Amendment" },
  { value: "stock_certificate", label: "Stock Certificate" },
  { value: "other", label: "Other" },
];

const STATUS_COLORS = {
  pending: C.amber,
  analyzing: C.cyan,
  complete: C.green,
  error: C.red,
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : "---";
const fmtSize = (bytes) => {
  if (!bytes) return "---";
  return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
};

const LegalDocs = () => {
  const [documents, setDocuments] = useState([]);
  const [ownership, setOwnership] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploadEntity, setUploadEntity] = useState("");
  const [uploadType, setUploadType] = useState("other");
  const fileInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, ownerRes] = await Promise.all([
        fetch("/api/documents").then(r => r.json()),
        fetch("/api/documents/ownership").then(r => r.json()).catch(() => ({ ownership: [] })),
      ]);
      setDocuments(docsRes.documents || []);
      setOwnership(ownerRes.ownership || []);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(",")[1];
        const entity = entityData.entities.find(en => en.id === uploadEntity);

        const res = await fetch("/api/documents/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            content_base64: base64,
            mime_type: file.type || "application/pdf",
            document_type: uploadType,
            entity_id: uploadEntity || null,
            entity_name: entity?.shortName || null,
          }),
        });

        const data = await res.json();
        if (data.document) {
          fetchData();
        } else {
          alert(data.error || "Upload failed");
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert("Upload error: " + err.message);
      setUploading(false);
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async (docId) => {
    setAnalyzing(docId);
    try {
      const res = await fetch("/api/documents/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: docId }),
      });
      const data = await res.json();
      if (data.status === "complete") {
        fetchData();
      } else if (data.error) {
        alert("Analysis error: " + data.error);
      }
    } catch (err) {
      alert("Analysis failed: " + err.message);
    } finally {
      setAnalyzing(null);
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm("Delete this document and its analysis?")) return;
    await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: docId }),
    });
    setSelectedDoc(null);
    fetchData();
  };

  const analyzedCount = documents.filter(d => d.analysis_status === "complete").length;
  const entitiesExtracted = new Set(documents.flatMap(d => (d.extracted_entities || []).map(e => e.entity_id))).size;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Legal Documents</h1>
        <div style={{ fontSize: 13, color: C.muted }}>
          Upload entity formation docs · Victoria analyzes ownership structure · Auto-maps entities
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <KPI label="Documents" value={documents.length} sub="Uploaded" color={C.accent} />
        <KPI label="Analyzed" value={analyzedCount} sub={`${documents.length - analyzedCount} pending`} color={C.green} />
        <KPI label="Entities Found" value={entitiesExtracted} sub="From documents" color={C.purple} />
        <KPI label="Ownership Records" value={ownership.length} sub="Extracted" color={C.cyan} />
      </div>

      {/* Upload Section */}
      <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <select value={uploadType} onChange={e => setUploadType(e.target.value)}
            style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 13 }}>
            {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={uploadEntity} onChange={e => setUploadEntity(e.target.value)}
            style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 13 }}>
            <option value="">Entity (optional)</option>
            {entityData.entities.map(e => <option key={e.id} value={e.id}>{e.shortName}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={handleUpload}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              background: C.accent, color: "#fff", border: "none", borderRadius: 8,
              padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
              opacity: uploading ? 0.7 : 1,
            }}
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </Card>

      {loading ? (
        <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>Loading documents...</div>
      ) : (
        <>
          {/* Documents List */}
          {documents.length === 0 ? (
            <Card>
              <div style={{ color: C.muted, textAlign: "center", padding: 30 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>&#128196;</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 6 }}>No documents uploaded yet</div>
                <div style={{ fontSize: 13 }}>
                  Upload operating agreements, articles of incorporation, partnership agreements, and other entity formation documents.
                  Victoria will analyze each one and extract the ownership structure automatically.
                </div>
              </div>
            </Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
              {documents.map(doc => {
                const statusColor = STATUS_COLORS[doc.analysis_status] || C.muted;
                const isAnalyzing = analyzing === doc.id;
                const analysis = doc.analysis_result;
                return (
                  <Card key={doc.id} style={{ padding: 0, overflow: "hidden" }}>
                    {/* Header */}
                    <div style={{
                      background: doc.analysis_status === "complete"
                        ? "linear-gradient(135deg, #065f46 0%, #047857 100%)"
                        : `linear-gradient(135deg, ${C.surface} 0%, ${C.card} 100%)`,
                      padding: "12px 16px",
                      borderBottom: `1px solid ${C.border}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                          {doc.filename}
                        </div>
                        <Badge label={doc.analysis_status} color={statusColor} />
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                        {fmtSize(doc.file_size)} · {fmtDate(doc.created_at)}
                        {doc.entity_name && <> · <span style={{ color: C.purple }}>{doc.entity_name}</span></>}
                      </div>
                    </div>

                    <div style={{ padding: 14 }}>
                      {/* Analysis summary */}
                      {analysis && (
                        <div style={{ marginBottom: 12 }}>
                          {analysis.summary && (
                            <div style={{ fontSize: 12, color: C.text, marginBottom: 8, lineHeight: 1.4 }}>
                              {analysis.summary}
                            </div>
                          )}
                          {analysis.document_type && (
                            <Badge label={analysis.document_type.replace(/_/g, " ")} color={C.cyan} />
                          )}
                          {analysis.ownership_structure?.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Ownership:</div>
                              {analysis.ownership_structure.map((o, i) => (
                                <div key={i} style={{ fontSize: 12, color: C.text, padding: "2px 0" }}>
                                  <span style={{ color: C.green, fontWeight: 600 }}>{o.ownership_percentage}%</span>
                                  {" "}{o.owner_name} → {o.owned_entity_name}
                                  {o.shares && <span style={{ color: C.muted }}> ({o.shares} shares)</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 8 }}>
                        {doc.analysis_status !== "complete" && (
                          <button
                            onClick={() => handleAnalyze(doc.id)}
                            disabled={isAnalyzing}
                            style={{
                              flex: 1, background: C.accent, color: "#fff", border: "none", borderRadius: 6,
                              padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer",
                              opacity: isAnalyzing ? 0.6 : 1,
                            }}
                          >
                            {isAnalyzing ? "Victoria is analyzing..." : "Analyze with Victoria"}
                          </button>
                        )}
                        {doc.analysis_status === "complete" && (
                          <button onClick={() => setSelectedDoc(selectedDoc === doc.id ? null : doc.id)}
                            style={{ flex: 1, background: C.surface, color: C.accent, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 0", fontSize: 12, cursor: "pointer" }}>
                            {selectedDoc === doc.id ? "Hide Details" : "View Full Analysis"}
                          </button>
                        )}
                        {doc.analysis_status === "error" && (
                          <button onClick={() => handleAnalyze(doc.id)}
                            style={{ flex: 1, background: C.surface, color: C.amber, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 0", fontSize: 12, cursor: "pointer" }}>
                            Retry Analysis
                          </button>
                        )}
                        <button onClick={() => handleDelete(doc.id)}
                          style={{ background: C.surface, color: C.red, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}>
                          Delete
                        </button>
                      </div>

                      {/* Error message */}
                      {doc.analysis_error && (
                        <div style={{ fontSize: 11, color: C.red, marginTop: 8 }}>{doc.analysis_error}</div>
                      )}
                    </div>

                    {/* Full analysis detail (expandable) */}
                    {selectedDoc === doc.id && analysis && (
                      <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                        {/* Entities */}
                        {analysis.entities?.length > 0 && (
                          <>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>Entities Found</div>
                            {analysis.entities.map((e, i) => (
                              <div key={i} style={{ fontSize: 12, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>
                                <span style={{ fontWeight: 600, color: C.text }}>{e.entity_name}</span>
                                <span style={{ color: C.muted }}> · {e.entity_type} · {e.state_of_formation}</span>
                                {e.ein && <span style={{ color: C.muted }}> · EIN: {e.ein}</span>}
                                <Badge label={e.role_in_document} color={C.cyan} />
                              </div>
                            ))}
                          </>
                        )}

                        {/* Key Provisions */}
                        {analysis.key_provisions?.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>Key Provisions</div>
                            {analysis.key_provisions.map((p, i) => (
                              <div key={i} style={{ fontSize: 11, color: C.muted, padding: "2px 0" }}>• {p}</div>
                            ))}
                          </div>
                        )}

                        {/* Management */}
                        {analysis.management_structure && (
                          <div style={{ marginTop: 8, fontSize: 12 }}>
                            <span style={{ color: C.muted }}>Management: </span>
                            <span style={{ color: C.text }}>{analysis.management_structure}</span>
                          </div>
                        )}

                        {/* Raw JSON toggle */}
                        <details style={{ marginTop: 10 }}>
                          <summary style={{ fontSize: 11, color: C.muted, cursor: "pointer" }}>Raw JSON</summary>
                          <pre style={{ fontSize: 10, color: C.muted, background: C.bg, padding: 8, borderRadius: 6, overflow: "auto", maxHeight: 200, marginTop: 4 }}>
                            {JSON.stringify(analysis, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Extracted Ownership Summary */}
          {ownership.length > 0 && (
            <Card>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 12 }}>
                Extracted Ownership Map
              </div>
              <Table
                columns={["Entity", "Type", "State", "Owned By", "Ownership %", "Shares", "Source"]}
                rows={ownership.map(o => [
                  <span style={{ fontWeight: 600 }}>{o.entity_name}</span>,
                  <Badge label={o.entity_type || "---"} />,
                  o.state || "---",
                  o.owned_by || "---",
                  <span style={{ fontWeight: 600, color: C.green }}>{o.ownership_pct ? `${o.ownership_pct}%` : "---"}</span>,
                  o.shares_outstanding || "---",
                  <span style={{ fontSize: 10, color: C.muted }}>{o.source_document_id ? "Doc" : "Manual"}</span>,
                ])}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default LegalDocs;
