import { ArrowUp, Paperclip, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

const InputMessage = ({ onSubmit, onTyping }) => {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);

  const handleChange = (e) => {
    setMessage(e.target.value);

    if (onTyping) {
      onTyping(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() || files.length) {
        handleSubmit();
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files.length === 0) return;
    if( files.length + e.target.files.length > 10 ) {
      alert("You can upload a maximum of 10 files.");
      return;
    }
    setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    e.target.value = ""; 
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!message.trim() && files.length === 0) return;

    onSubmit(
      message.trim(),
      files);

    setMessage("");
    setFiles([]);

    if (onTyping) onTyping(false);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        128
      )}px`;
    }
  }, [message]);

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      if (onTyping) onTyping(false);
    };
  }, []);

  return (
    <div className="w-full px-4 py-2">
      {/* File preview */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-muted px-3 py-1 rounded-lg text-xs"
            >
              <span className="max-w-[120px] truncate">{file.name}</span>
              <button onClick={() => removeFile(idx)}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-background rounded-xl flex px-4 items-center gap-3 py-2">
        {/* Upload button */}
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current.click()}
        >
          <Paperclip size={18} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={handleFileSelect}
        />

        <textarea
          ref={textareaRef}
          placeholder="Type a message..."
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          className="flex-grow text-[14px] px-2 py-2 bg-transparent focus:outline-none resize-none text-foreground placeholder:text-muted-foreground overflow-y-auto"
          style={{ lineHeight: "1.5rem" }}
        />

        <button
          onClick={handleSubmit}
          disabled={!message.trim() && files.length === 0}
          className="p-2 bg-emerald-500 disabled:opacity-65 rounded-xl hover:scale-105 transition-all duration-150"
        >
          <ArrowUp size={22} className="text-white" />
        </button>
      </div>
    </div>
  );
};

export default InputMessage;
