// utils/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://djurtjncbuhzjhfxowmg.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqdXJ0am5jYnVoempoZnhvd21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Nzc2NzksImV4cCI6MjA5MDA1MzY3OX0.JO1hfIBSzhlbFqZovjVAZOBKqZea6ijEMMpShGZpwq0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Upload any file (voice, image, etc.)
export const uploadFileToSupabase = async (
  file,
  chatId,
  messageId,
  fileType = "file"
) => {
  try {
    // Determine folder based on file type
    let folder = "attachments";
    if (file.type?.startsWith("image/")) {
      folder = "images";
    } else if (file.type?.startsWith("audio/")) {
      folder = "voice";
    }

    const fileExtension = file.name.split(".").pop();
    const fileName = `${folder}_${chatId}_${messageId}_${Date.now()}.${fileExtension}`;
    const filePath = `${folder}/${fileName}`;

    console.log("Uploading to Supabase:", filePath);
    console.log("File type:", file.type);
    console.log("File size:", file.size, "bytes");

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("chat-attachments")
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error details:", error);
      throw error;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);

    console.log("Upload successful:", publicUrl);

    return {
      name: file.name,
      url: publicUrl,
      type: file.type,
      size: file.size,
      path: filePath,
      folder: folder,
    };
  } catch (error) {
    console.error("Supabase upload error:", error.message);
    return null;
  }
};

// Upload voice message
export const uploadVoiceToSupabase = async (audioBlob, chatId, messageId) => {
  const file = new File([audioBlob], `voice_${Date.now()}.webm`, {
    type: "audio/webm",
  });
  return uploadFileToSupabase(file, chatId, messageId, "voice");
};

// Delete file from Supabase
export const deleteFileFromSupabase = async (filePath) => {
  try {
    if (!filePath) return false;

    const { error } = await supabase.storage
      .from("chat-attachments")
      .remove([filePath]);

    if (error) throw error;
    console.log("File deleted successfully:", filePath);
    return true;
  } catch (error) {
    console.error("Delete error:", error);
    return false;
  }
};

// Delete multiple files
export const deleteMultipleFilesFromSupabase = async (filePaths) => {
  try {
    if (!filePaths || filePaths.length === 0) return true;

    const { error } = await supabase.storage
      .from("chat-attachments")
      .remove(filePaths);

    if (error) throw error;
    console.log("Files deleted successfully:", filePaths.length);
    return true;
  } catch (error) {
    console.error("Delete error:", error);
    return false;
  }
};

// Get file URL
export const getFileUrl = (filePath) => {
  const {
    data: { publicUrl },
  } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);
  return publicUrl;
};

// Test connection and bucket
export const testSupabaseConnection = async () => {
  try {
    // First, check if bucket exists
    const { data: buckets, error: bucketError } =
      await supabase.storage.listBuckets();

    if (bucketError) throw bucketError;

    const bucketExists = buckets.some((b) => b.id === "chat-attachments");

    if (!bucketExists) {
      console.error("Bucket 'chat-attachments' does not exist!");
      return false;
    }

    // Try to list files in the bucket
    const { data, error } = await supabase.storage
      .from("chat-attachments")
      .list();

    if (error) {
      console.error("Cannot access bucket:", error.message);
      return false;
    }

    console.log("Supabase connection successful! Bucket accessible.");
    return true;
  } catch (error) {
    console.error("Connection test failed:", error);
    return false;
  }
};

// utils/supabase.js

export const uploadProfileImage = async (file, userId) => {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `profile_${userId}_${Date.now()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    console.log(
      "Uploading profile image to chat-attachments bucket:",
      filePath
    );

    // Upload to chat-attachments bucket instead of profile-image
    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    // Get public URL from chat-attachments bucket
    const {
      data: { publicUrl },
    } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);

    console.log("Profile image uploaded successfully:", publicUrl);
    return publicUrl;
  } catch (err) {
    console.error("Profile image upload error:", err);
    return null;
  }
};
