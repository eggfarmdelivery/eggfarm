import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("환경변수가 설정되지 않았습니다");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createStorageBucket() {
  try {
    const { data, error } = await supabase.storage.createBucket(
      "delivery-photos",
      {
        public: true,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
        fileSizeLimit: 5242880, // 5MB
      }
    );

    if (error) {
      if (error.message.includes("already exists")) {
        console.log("✅ delivery-photos 버킷이 이미 존재합니다");
      } else {
        throw error;
      }
    } else {
      console.log("✅ delivery-photos 버킷 생성 완료!");
    }
  } catch (err) {
    console.error("❌ 오류:", err);
    process.exit(1);
  }
}

createStorageBucket();
