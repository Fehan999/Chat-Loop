import { createClient } from "@supabase/supabase-js";

// anon key is safe to ship, the bucket policies decide what it can do
const supabaseUrl = "https://djurtjncbuhzjhfxowmg.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqdXJ0am5jYnVoempoZnhvd21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Nzc2NzksImV4cCI6MjA5MDA1MzY3OX0.JO1hfIBSzhlbFqZovjVAZOBKqZea6ijEMMpShGZpwq0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET = "chat-attachments";

const folderFor = (type = "") => {
  if (type.startsWith("image/")) return "images";
  if (type.startsWith("audio/")) return "voice";
  return "attachments";
};

const extensionFor = (file) => {
  const fromName = file.name?.includes(".") ? file.name.split(".").pop() : "";
  if (fromName) return fromName.toLowerCase();
  return file.type?.split("/")[1]?.split(";")[0] || "bin";
};

// uploads chat media and returns the attachment object we store on the message
export const uploadFileToSupabase = async (file, chatId, messageId) => {
  try {
    const folder = folderFor(file.type);
    const filePath = `${folder}/${folder}_${chatId}_${messageId}_${Date.now()}.${extensionFor(file)}`;

    const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    return {
      name: file.name,
      url: publicUrl,
      type: file.type,
      size: file.size,
      path: filePath,
      folder,
    };
  } catch (error) {
    console.error("Supabase upload failed:", error.message);
    return null;
  }
};

export const deleteFilesFromSupabase = async (filePaths = []) => {
  const paths = filePaths.filter(Boolean);
  if (paths.length === 0) return true;
  try {
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Supabase delete failed:", error);
    return false;
  }
};

// profile pictures live in the same bucket under profiles/
export const uploadProfileImage = async (file, userId) => {
  try {
    const filePath = `profiles/profile_${userId}_${Date.now()}.${extensionFor(file)}`;

    const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    });
    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return publicUrl;
  } catch (err) {
    console.error("Profile image upload failed:", err);
    return null;
  }
};
