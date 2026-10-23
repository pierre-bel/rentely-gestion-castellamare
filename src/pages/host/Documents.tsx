import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, FileText, Image as ImageIcon, Download, Pencil, Trash2, Loader2, Search, File } from "lucide-react";

interface HostDocument {
  id: string;
  host_user_id: string;
  name: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
}

const BUCKET = "host-documents";
const MAX_SIZE = 20 * 1024 * 1024;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx";

const formatSize = (b: number) =>
  b < 1024 ? `${b} o` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} Ko` : `${(b / 1024 / 1024).toFixed(1)} Mo`;
const formatDate = (d: string) => {
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, "0")}-${String(x.getMonth() + 1).padStart(2, "0")}-${x.getFullYear()}`;
};
const isPdf = (d: HostDocument) => d.mime_type === "application/pdf" || d.name.toLowerCase().endsWith(".pdf");
const isImage = (d: HostDocument) => (d.mime_type || "").startsWith("image/");

const db = () => supabase.from("host_documents" as any);

export default function Documents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<HostDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<{ doc: HostDocument; url: string } | null>(null);
  const [toDelete, setToDelete] = useState<HostDocument | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await db().select("*").eq("host_user_id", user.id).order("created_at", { ascending: false });
    if (error) toast({ title: "Erreur", description: "Impossible de charger les documents", variant: "destructive" });
    setDocs((data as any) || []);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { load(); }, [load]);

  const upload = async (files: FileList | File[]) => {
    if (!user) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (file.size > MAX_SIZE) {
        toast({ title: "Fichier trop lourd", description: `${file.name} dépasse 20 Mo`, variant: "destructive" });
        continue;
      }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (upErr) {
        toast({ title: "Erreur", description: `Échec de l'envoi de ${file.name}`, variant: "destructive" });
        continue;
      }
      const { error } = await db().insert({
        host_user_id: user.id, name: file.name, file_path: path, mime_type: file.type || null, size_bytes: file.size,
      } as any);
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]);
        toast({ title: "Erreur", description: `Échec de l'enregistrement de ${file.name}`, variant: "destructive" });
      }
    }
    setUploading(false);
    load();
  };

  const signedUrl = async (doc: HostDocument, download = false) => {
    const { data, error } = await supabase.storage.from(BUCKET)
      .createSignedUrl(doc.file_path, 3600, download ? { download: doc.name } : undefined);
    if (error || !data) {
      toast({ title: "Erreur", description: "Impossible d'ouvrir le document", variant: "destructive" });
      return null;
    }
    return data.signedUrl;
  };

  const openPreview = async (doc: HostDocument) => {
    const url = await signedUrl(doc);
    if (url) setPreview({ doc, url });
  };

  const download = async (doc: HostDocument) => {
    const url = await signedUrl(doc, true);
    if (url) window.location.href = url;
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await supabase.storage.from(BUCKET).remove([toDelete.file_path]);
    const { error } = await db().delete().eq("id", toDelete.id);
    if (error) toast({ title: "Erreur", description: "Suppression impossible", variant: "destructive" });
    else toast({ title: "Document supprimé" });
    setToDelete(null);
    load();
  };

  const saveRename = async () => {
    if (!renaming || !renaming.name.trim()) return setRenaming(null);
    const { error } = await db().update({ name: renaming.name.trim() } as any).eq("id", renaming.id);
    if (error) toast({ title: "Erreur", description: "Renommage impossible", variant: "destructive" });
    setRenaming(null);
    load();
  };

  const filtered = docs.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container mx-auto px-2 sm:px-4 pb-8 lg:px-8 space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) upload(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden"
          onChange={(e) => { if (e.target.files?.length) upload(e.target.files); e.target.value = ""; }} />
        {uploading ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /> : <Upload className="mx-auto h-8 w-8 text-muted-foreground" />}
        <p className="mt-2 font-medium">Glissez vos fichiers ici ou cliquez pour ajouter</p>
        <p className="text-sm text-muted-foreground">PDF, images, Word, Excel — 20 Mo max par fichier</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Rechercher un document…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Aucun document</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((d) => {
                const Icon = isPdf(d) ? FileText : isImage(d) ? ImageIcon : File;
                return (
                  <li key={d.id} className="flex items-center gap-3 p-3 hover:bg-muted/40">
                    <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => openPreview(d)}>
                      <Icon className="h-6 w-6 shrink-0 text-primary" />
                      <div className="min-w-0">
                        {renaming?.id === d.id ? (
                          <Input autoFocus value={renaming.name} onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setRenaming({ id: d.id, name: e.target.value })}
                            onBlur={saveRename} onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setRenaming(null); }} />
                        ) : (
                          <p className="truncate font-medium">{d.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{formatSize(d.size_bytes)} · {formatDate(d.created_at)}</p>
                      </div>
                    </button>
                    <Button variant="ghost" size="icon" aria-label="Télécharger" onClick={() => download(d)}><Download className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Renommer" onClick={() => setRenaming({ id: d.id, name: d.name })}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={() => setToDelete(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle className="truncate pr-8">{preview?.doc.name}</DialogTitle></DialogHeader>
          {preview && (isPdf(preview.doc) ? (
            <iframe src={preview.url} title={preview.doc.name} className="flex-1 w-full rounded border border-border" />
          ) : isImage(preview.doc) ? (
            <div className="flex-1 overflow-auto flex items-center justify-center">
              <img src={preview.url} alt={preview.doc.name} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <File className="h-12 w-12" />
              <p>Aperçu indisponible pour ce type de fichier.</p>
              <Button onClick={() => download(preview.doc)}><Download className="h-4 w-4 mr-2" />Télécharger</Button>
            </div>
          ))}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>« {toDelete?.name} » sera définitivement supprimé.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
