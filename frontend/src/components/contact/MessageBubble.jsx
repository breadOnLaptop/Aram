import React from "react";
import { Check, CheckCheck, Download } from "lucide-react";

const isImage = (fileType) =>
  ["image", "jpg", "jpeg", "png", "gif", "webp"].includes(fileType);

const downloadFile = async (url, filename) => {
  const response = await fetch(url);
  const blob = await response.blob();

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename || "file";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

const getStatus = (message) => {
  if (message.read) return "read";
  if (message.delivered) return "delivered";
  return "sent";
};

const MessageBubble = ({ message, isOwnMessage }) => {
  const { content, fileUrl = [] } = message;
  const status = getStatus(message);

  return (
    <div
      className={`w-full flex ${
        isOwnMessage ? "justify-end" : "justify-start"
      } my-1`}
    >
      <div
  className={`px-4 py-2 rounded-2xl text-sm break-words max-w-[85%] md:max-w-[70%] lg:max-w-[60%] space-y-2 relative ${
    isOwnMessage
      ? "bg-emerald-600 text-white rounded-br-md"
      : "bg-muted text-foreground rounded-bl-md"
  }`}
>

        {/* Text */}
        {content && <p>{content}</p>}

        {/* Files */}
        {fileUrl.map((file) => (
          <div key={file._id}>
            {isImage(file.fileType) ? (
              <img
                src={file.url}
                alt={file.originalName}
                className="max-w-[240px] rounded-lg cursor-pointer hover:opacity-90"
                onClick={() =>
                  downloadFile(file.url, file.originalName)
                }
              />
            ) : (
              <button
                key={file._id}
                onClick={() => downloadFile(file.url, file.originalName)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg 
                bg-black/10 hover:bg-black/20 transition 
                text-xs break-all ${
                  isOwnMessage ? "text-white" : "text-foreground"
                }`}
              >
                <Download size={14} />
                <span className="line-clamp-1">{file.originalName}</span>
              </button>

            )}
          </div>
        ))}

        {/* Status */}
        {isOwnMessage && (
        <div className="flex justify-end items-center gap-1 text-[10px] opacity-80 mt-1">
          {status === "sent" && <Check size={13} />}
          {status === "delivered" && <CheckCheck size={13} />}
          {status === "read" && (
            <CheckCheck size={13} className="text-blue-400" />
          )}
        </div>
        )}

      </div>
    </div>
  );
};

export default MessageBubble;
