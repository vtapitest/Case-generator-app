import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, File as FileIcon } from 'lucide-react';
import { EvidenceFile } from '@/types';
import { toast } from 'sonner';
import CryptoJS from 'crypto-js';

interface FileUploadProps {
  onFilesChange: (files: EvidenceFile[]) => void;
  initialFiles?: EvidenceFile[];
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesChange, initialFiles = [] }) => {
  const [files, setFiles] = useState<EvidenceFile[]>(initialFiles);

  const handleFileProcessing = (file: File): Promise<EvidenceFile> => {
    return new Promise((resolve, reject) => {
      const readerBase64 = new FileReader();
      const readerArrayBuffer = new FileReader();

      readerBase64.onload = () => {
        readerArrayBuffer.onload = () => {
          try {
            const wordArray = CryptoJS.lib.WordArray.create(readerArrayBuffer.result as ArrayBuffer);
            const hash = CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);
            
            resolve({
              name: file.name,
              size: file.size,
              mime: file.type,
              sha256: hash,
              content: readerBase64.result as string,
            });
          } catch (error) {
            reject(error);
          }
        };
        readerArrayBuffer.readAsArrayBuffer(file);
      };
      readerBase64.onerror = error => reject(error);
      readerArrayBuffer.onerror = error => reject(error);
      
      readerBase64.readAsDataURL(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFilesPromises = acceptedFiles.map(handleFileProcessing);
    try {
      const newFiles = await Promise.all(newFilesPromises);
      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
      toast.success(`${newFiles.length} archivo(s) añadido(s).`);
    } catch (error) {
      console.error("Error processing files:", error);
      toast.error("Error al procesar uno o más archivos.");
    }
  }, [files, onFilesChange]);

  const removeFile = (fileName: string) => {
    const updatedFiles = files.filter(f => f.name !== fileName);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-accent' : 'border-border hover:border-primary'
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">
          {isDragActive ? 'Suelta los archivos aquí...' : 'Arrastra y suelta archivos aquí, o haz clic para seleccionar'}
        </p>
      </div>
      {files.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Archivos Adjuntos:</h4>
          <ul className="space-y-2">
            {files.map(file => (
              <li key={file.name} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileIcon className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate" title={file.name}>{file.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">({(file.size / 1024).toFixed(2)} KB)</span>
                </div>
                <button type="button" onClick={() => removeFile(file.name)} className="p-1 text-red-500 hover:text-red-700">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;