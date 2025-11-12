import React, { useRef, useState } from 'react';
import { Upload, X, File, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  selectedFile: File | null;
  accept?: string;
  maxSizeMB?: number;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  onRemove,
  selectedFile,
  accept = 'image/*,.pdf,.doc,.docx',
  maxSizeMB = 10,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    setError(null);
    onFileSelect(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const isImage = selectedFile?.type.startsWith('image/');

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      
      {!selectedFile ? (
        <Button
          type="button"
          variant="outline"
          onClick={handleClick}
          className="flex items-center gap-2"
        >
          <Upload size={16} />
          Attach File
        </Button>
      ) : (
        <div className="flex items-center gap-2 p-2 bg-[#1E223D] rounded-lg border border-[#2F3655]">
          {isImage ? (
            <ImageIcon size={16} className="text-[#8B5CF6]" />
          ) : (
            <File size={16} className="text-[#6366F1]" />
          )}
          <span className="flex-1 text-sm text-[#E5E7EB] truncate">
            {selectedFile.name}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 hover:bg-white/10 rounded transition"
            aria-label="Remove file"
          >
            <X size={14} className="text-[#E5E7EB]/70" />
          </button>
        </div>
      )}
      
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
};

