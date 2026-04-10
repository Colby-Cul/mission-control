import { useState, useEffect, useRef, useCallback } from "react";
import heic2any from "heic2any";
import { Card } from "../components/shared";
import { C } from "../data/constants";
import { supabase } from "../lib/supabase";

const PROPERTIES = [
  { id: "northstar", label: "Northstar Luxury Retreat" },
  { id: "graeagle", label: "Graeagle Mountain Cabin" },
];

const CLS_BASE = "https://californialuxurystays.com";

// Convert any image file to JPEG (handles HEIC, WebP, PNG, etc.)
const toJpeg = async (file) => {
  // If already JPEG, return as-is
  if (file.type === "image/jpeg") return file;

  let blob = file;

  // HEIC/HEIF needs special decoding
  const isHeic = file.type === "image/heic" || file.type === "image/heif" ||
    /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
  if (isHeic) {
    try {
      blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
      if (Array.isArray(blob)) blob = blob[0];
    } catch (err) {
      console.error("HEIC conversion failed:", err);
      return file; // return original if conversion fails
    }
  }

  // For non-JPEG/non-HEIC (PNG, WebP, etc.), use canvas
  if (!isHeic && file.type !== "image/jpeg") {
    blob = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxW = 1920;
          const scale = img.width > maxW ? maxW / img.width : 1;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  const newName = file.name.replace(/\.[^.]+$/, ".jpg");
  return new File([blob], newName, { type: "image/jpeg" });
};

const PhotoManager = () => {
  const [property, setProperty] = useState("northstar");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [editingAlt, setEditingAlt] = useState(null);
  const fileInputRef = useRef(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("property_photos")
      .select("*")
      .eq("property_id", property)
      .order("sort_order", { ascending: true });
    if (!error) setPhotos(data || []);
    setLoading(false);
  }, [property]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const saveOrder = async (updated) => {
    const promises = updated.map((p, i) =>
      supabase.from("property_photos").update({ sort_order: i + 1, updated_at: new Date().toISOString() }).eq("id", p.id)
    );
    await Promise.all(promises);
  };

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDragEnd = async () => {
    if (dragIdx === null || dragOverIdx === null || dragIdx === dragOverIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const updated = [...photos];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(dragOverIdx, 0, moved);
    setPhotos(updated);
    setDragIdx(null);
    setDragOverIdx(null);
    await saveOrder(updated);
  };

  const handleDelete = async (photo) => {
    if (!confirm(`Delete this photo? This cannot be undone.`)) return;
    await supabase.from("property_photos").delete().eq("id", photo.id);
    const updated = photos.filter(p => p.id !== photo.id);
    setPhotos(updated);
    await saveOrder(updated);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);

    const maxOrder = photos.length > 0 ? Math.max(...photos.map(p => p.sort_order)) : 0;
    const newPhotos = [];

    for (let i = 0; i < files.length; i++) {
      const file = await toJpeg(files[i]);
      const ext = file.name.split(".").pop().toLowerCase();
      const fileName = `${property}/${Date.now()}-${i}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("property-photos")
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("property-photos")
        .getPublicUrl(fileName);

      const { data: row, error: insertError } = await supabase
        .from("property_photos")
        .insert({
          property_id: property,
          src: urlData.publicUrl,
          alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
          sort_order: maxOrder + i + 1,
        })
        .select()
        .single();

      if (!insertError && row) newPhotos.push(row);
    }

    setPhotos([...photos, ...newPhotos]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAltSave = async (photo, newAlt) => {
    await supabase.from("property_photos").update({ alt: newAlt, updated_at: new Date().toISOString() }).eq("id", photo.id);
    setPhotos(photos.map(p => p.id === photo.id ? { ...p, alt: newAlt } : p));
    setEditingAlt(null);
  };

  const movePhoto = async (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= photos.length) return;
    const updated = [...photos];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setPhotos(updated);
    await saveOrder(updated);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: 0 }}>Photo Manager</h1>
          <p style={{ color: "#9ca3af", fontSize: 14, marginTop: 4 }}>
            Drag to reorder, click to edit alt text, upload new photos
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select
            value={property}
            onChange={(e) => setProperty(e.target.value)}
            style={{
              background: C.card, color: C.text, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "8px 12px", fontSize: 14, cursor: "pointer",
            }}
          >
            {PROPERTIES.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              background: C.accent, color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
              opacity: uploading ? 0.5 : 1,
            }}
          >
            {uploading ? "Uploading..." : "Upload Photos"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            style={{ display: "none" }}
          />
        </div>
      </div>

      <Card style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ color: "#9ca3af", fontSize: 13 }}>
            {photos.length} photo{photos.length !== 1 ? "s" : ""} — drag to reorder
          </span>
        </div>

        {loading ? (
          <div style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>Loading photos...</div>
        ) : photos.length === 0 ? (
          <div style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>
            No photos yet. Click "Upload Photos" to add some.
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}>
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                style={{
                  position: "relative",
                  borderRadius: 8,
                  border: `2px solid ${dragOverIdx === idx ? C.accent : "transparent"}`,
                  background: dragIdx === idx ? "rgba(99,102,241,0.1)" : C.bg,
                  opacity: dragIdx === idx ? 0.6 : 1,
                  cursor: "grab",
                  transition: "border-color 0.15s, opacity 0.15s",
                  overflow: "hidden",
                }}
              >
                {/* Order badge */}
                <div style={{
                  position: "absolute", top: 8, left: 8, zIndex: 2,
                  background: "rgba(0,0,0,0.7)", color: "#fff",
                  borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600,
                }}>
                  {idx + 1}
                </div>

                {/* Action buttons */}
                <div style={{
                  position: "absolute", top: 8, right: 8, zIndex: 2,
                  display: "flex", gap: 4,
                }}>
                  <button
                    onClick={() => movePhoto(idx, -1)}
                    disabled={idx === 0}
                    title="Move up"
                    style={{
                      background: "rgba(0,0,0,0.7)", color: "#fff", border: "none",
                      borderRadius: 4, width: 24, height: 24, cursor: "pointer",
                      fontSize: 14, opacity: idx === 0 ? 0.3 : 1,
                    }}
                  >↑</button>
                  <button
                    onClick={() => movePhoto(idx, 1)}
                    disabled={idx === photos.length - 1}
                    title="Move down"
                    style={{
                      background: "rgba(0,0,0,0.7)", color: "#fff", border: "none",
                      borderRadius: 4, width: 24, height: 24, cursor: "pointer",
                      fontSize: 14, opacity: idx === photos.length - 1 ? 0.3 : 1,
                    }}
                  >↓</button>
                  <button
                    onClick={() => handleDelete(photo)}
                    title="Delete photo"
                    style={{
                      background: "rgba(239,68,68,0.8)", color: "#fff", border: "none",
                      borderRadius: 4, width: 24, height: 24, cursor: "pointer",
                      fontSize: 14,
                    }}
                  >×</button>
                </div>

                {/* Image */}
                <img
                  src={photo.src.startsWith("http") ? photo.src : `${CLS_BASE}${photo.src}`}
                  alt={photo.alt}
                  style={{
                    width: "100%", height: 160, objectFit: "cover",
                    display: "block", borderRadius: "6px 6px 0 0",
                  }}
                  onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='160' fill='%23374151'%3E%3Crect width='200' height='160'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='14'%3ENo preview%3C/text%3E%3C/svg%3E"; }}
                />

                {/* Alt text */}
                <div style={{ padding: "8px 10px" }}>
                  {editingAlt === photo.id ? (
                    <input
                      autoFocus
                      defaultValue={photo.alt}
                      onBlur={(e) => handleAltSave(photo, e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAltSave(photo, e.target.value); if (e.key === "Escape") setEditingAlt(null); }}
                      style={{
                        width: "100%", background: C.bg, color: C.text,
                        border: `1px solid ${C.accent}`, borderRadius: 4,
                        padding: "4px 6px", fontSize: 11,
                      }}
                    />
                  ) : (
                    <p
                      onClick={() => setEditingAlt(photo.id)}
                      title="Click to edit alt text"
                      style={{
                        color: "#9ca3af", fontSize: 11, margin: 0,
                        cursor: "text", lineHeight: 1.3,
                        overflow: "hidden", textOverflow: "ellipsis",
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      }}
                    >
                      {photo.alt || "Click to add alt text"}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PhotoManager;
