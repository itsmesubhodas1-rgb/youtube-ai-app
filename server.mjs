import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.static("public"));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/chat", async (req, res) => {
  try {
    const { message, image } = req.body;

    // যদি ইউজার ছবি বানাতে বলেন (যেমন: "ছবি বানাও", "কার্টুন বানাও", "image", "generate")
    const isImageRequest = /(ছবি বানাও|ছবি তৈরি|কার্টুন বানাও|image|photo|generate image|draw|picture)/i.test(message || "");

    if (isImageRequest && !image) {
      // Imagen 3 মডেল দিয়ে ছবি তৈরি
      const response = await ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: message,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: "1:1" // ১:১ স্কয়ার ছবি
        }
      });

      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

      return res.json({ 
        reply: "আপনার বর্ণনানুযায়ী ছবিটি নিচে তৈরি করে দেওয়া হলো:",
        generatedImage: imageUrl 
      });
    }

    // সাধারণ চ্যাট বা থাম্বনেইল ভিশন অ্যানালাইসিস
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

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: parts
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error("Error details:", error);
    res.status(500).json({ error: "সার্ভারে সমস্যা হয়েছে।" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
