"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Send, MessageCircle, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";
import {
  subscribeToEventBookingMessages,
  sendEventBookingMessage,
  markEventBookingMessagesRead,
} from "@/lib/firestore";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg","image/png","image/gif","image/webp","application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","text/plain"];

function AttachmentPreview({ file, onRemove }) {
  const isImg = file.type.startsWith("image/");
  return (
    <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs">
      {isImg ? <ImageIcon className="h-3.5 w-3.5 text-rose-400" /> : <FileText className="h-3.5 w-3.5 text-rose-400" />}
      <span className="max-w-[120px] truncate font-medium text-rose-700">{file.name}</span>
      <span className="text-slate-400">({(file.size / 1024).toFixed(0)} ko)</span>
      <button type="button" onClick={onRemove} className="text-slate-400 hover:text-rose-500">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function MessageAttachment({ att }) {
  const isImg = att.type?.startsWith("image/");
  if (isImg) {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block mt-1">
        <img src={att.url} alt={att.name} className="max-h-40 max-w-[220px] rounded-xl border border-white/20 object-cover" />
      </a>
    );
  }
  return (
    <a href={att.url} target="_blank" rel="noopener noreferrer"
      className="mt-1 flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate max-w-[160px]">{att.name}</span>
    </a>
  );
}

export default function BookingThread({ bookingId, currentUser, senderRole, isFr }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [fileError, setFileError] = useState("");
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const isAdmin = senderRole === "admin" || senderRole === "event_manager";

  useEffect(() => {
    if (!bookingId) return;
    const unsub = subscribeToEventBookingMessages(
      bookingId,
      (msgs) => {
        setMessages(msgs);
        const u = msgs.filter((m) => m.senderRole !== senderRole && !m.read).length;
        setUnread(u);
      },
      () => {}
    );
    return () => unsub();
  }, [bookingId, senderRole]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!bookingId || unread === 0) return;
    const t = setTimeout(() => {
      markEventBookingMessagesRead(bookingId, senderRole).catch(() => {});
    }, 1000);
    return () => clearTimeout(t);
  }, [bookingId, unread, senderRole]);

  function handleFileChange(e) {
    setFileError("");
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) {
        setFileError(isFr ? `Fichier trop lourd (max 15 Mo) : ${f.name}` : `Fichye twò gwo (max 15 Mo) : ${f.name}`);
        return;
      }
      if (!ALLOWED_TYPES.includes(f.type)) {
        setFileError(isFr ? `Type non accepté : ${f.name}` : `Tip fichye pa aksepte : ${f.name}`);
        return;
      }
    }
    setPendingFiles((prev) => [...prev, ...files].slice(0, 3));
    e.target.value = "";
  }

  async function uploadFiles() {
    if (!pendingFiles.length || !currentUser) return [];
    const storage = getFirebaseStorage();
    if (!storage) return [];
    const uploaded = [];
    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      const path = `eventBookings/${bookingId}/${currentUser.uid}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file);
        task.on("state_changed",
          (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            uploaded.push({ url, name: file.name, type: file.type, size: file.size });
            resolve();
          }
        );
      });
    }
    setUploadProgress(null);
    return uploaded;
  }

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && pendingFiles.length === 0) return;
    if (!currentUser) return;
    setSending(true);
    setFileError("");
    try {
      const attachments = await uploadFiles();
      await sendEventBookingMessage(bookingId, {
        text: trimmed,
        senderId: currentUser.uid,
        senderName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          (isAdmin ? "Équipe" : "Client"),
        senderRole,
        attachments,
      });
      setText("");
      setPendingFiles([]);
    } catch (err) {
      setFileError(isFr ? "Erreur lors de l'envoi du fichier." : "Erè pandan voye fichye a.");
    } finally {
      setSending(false);
    }
  }

  const placeholder = isFr
    ? (isAdmin ? "Répondre au client…" : "Poser une question…")
    : (isAdmin ? "Reponn kliyan an…" : "Poze yon kesyon…");

  const emptyLabel = isFr
    ? "Pas encore de messages. Commencez la conversation !"
    : "Pa gen mesaj ankò. Kòmanse konvèsasyon an !";

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        <MessageCircle className="h-3.5 w-3.5" />
        {isFr ? "Conversation" : "Konvèsasyon"}
        {unread > 0 && (
          <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
            {unread} nouveau{unread > 1 ? "x" : ""}
          </span>
        )}
      </div>

      {/* Messages list */}
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-3">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-slate-300 py-4">{emptyLabel}</p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderRole === senderRole;
            const ts = msg.createdAt?.toDate
              ? msg.createdAt.toDate()
              : msg.createdAt
              ? new Date(msg.createdAt)
              : null;
            const hasAttachments = Array.isArray(msg.attachments) && msg.attachments.length > 0;
            return (
              <div key={msg.id} className={`flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  isMine
                    ? "bg-gradient-to-br from-rose-500 to-fuchsia-500 text-white"
                    : "bg-white text-slate-700 shadow-sm border border-slate-100"
                }`}>
                  {msg.text && <p>{msg.text}</p>}
                  {hasAttachments && msg.attachments.map((att, i) => (
                    <MessageAttachment key={i} att={att} />
                  ))}
                </div>
                <p className="text-[10px] text-slate-300">
                  {msg.senderName}
                  {ts ? ` · ${format(ts, "d MMM HH:mm", { locale: fr })}` : ""}
                  {isMine && !msg.read && <span className="ml-1 text-rose-300">·✓</span>}
                  {isMine && msg.read && <span className="ml-1 text-emerald-400">·✓✓</span>}
                </p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingFiles.map((f, i) => (
            <AttachmentPreview key={i} file={f} onRemove={() => setPendingFiles((p) => p.filter((_, j) => j !== i))} />
          ))}
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 transition-all" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {/* File error */}
      {fileError && <p className="text-xs font-semibold text-red-500">{fileError}</p>}

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2">
        {isAdmin && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_TYPES.join(",")}
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              disabled={sending || pendingFiles.length >= 3}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 hover:border-rose-300 hover:text-rose-500 disabled:opacity-40"
              title={isFr ? "Joindre un fichier" : "Ajoute yon fichye"}
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          disabled={sending}
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={(!text.trim() && pendingFiles.length === 0) || sending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-500 text-white shadow disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
