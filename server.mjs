import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
// 50mb লিমিট পর্যন্ত ডেটা রিকোয়েস্ট এক্সেপ্ট করবে (ছবির জন্য প্রয়োজন)
app.use(express.json({ limit: "50mb" }));
// static ফাইলগুলো public ফোল্ডার থেকে সার্ভ করবে
app.use(express.static("public"));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/chat", async (req, res) => {
  try {
    const { message, image } = req.body;

    // ১. টেক্সট টু ইমেজ রিকোয়েস্ট যাচাই (ইউজার যদি ছবি বানাতে বলে)
    const isImageRequest = /(ছবি বানাও|ছবি তৈরি|কার্টুন বানাও|image|photo|generate image|draw|picture)/i.test(message || "");

    // যদি ইমেজ তৈরির রিকোয়েস্ট হয় এবং ইউজার কোনো ছবি আপলোড না করে থাকে
    if (isImageRequest && !image) {
      // Imagen 3.0 মডেল ব্যবহার করে ছবি তৈরি
      // দ্রষ্টব্য: Google GenAI লাইব্রেরির সঠিক সিনট্যাক্স ব্যবহার নিশ্চিত করুন
      try {
        const result = await ai.generateImages({
          model: "imagen-3.0-generate-002",
          prompt: message,
          config: {
            numberOfImages: 1,
            outputMimeType: "image/jpeg",
            aspectRatio: "1:1" // ১:১ স্কয়ার ছবি
          }
        });

        const base64ImageBytes = result.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

        return res.json({ 
          reply: "আপনার বর্ণনা অনুযায়ী ছবি নিচে তৈরি করে দেওয়া হলো:",
          generatedImage: imageUrl 
        });
      } catch (imageError) {
        console.error("Image generation error:", imageError);
        return res.json({ reply: `ছবি তৈরি করতে গিয়ে ত্রুটি হয়েছে: ${imageError.message}` });
      }
    }

    // ২. সাধারণ চ্যাট বা থাম্বনেইল ভিশন অ্যানালাইসিস (যদি ছবি তৈরির রিকোয়েস্ট না হয়)
    const parts = [];
    if (image) {
      const base64Data = image.split(",")[1];
      const mimeType = image.split(";")[0].split(":")[1];
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }

    if (message) {
      parts.push(message);
    }

    // Gemini 2.5 মডেল দিয়ে চ্যাট রিপ্লাই
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: parts
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error("Overall error details:", error);
    res.status(500).json({ error: `সার্ভারে সমস্যা হয়েছে: ${error.message}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
