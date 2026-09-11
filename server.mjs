import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.static("public"));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/chat", async (req, res) => {
  try {
    const { message, image } = req.body;

    // বাংলা, ইংরেজি এবং বাংলিশ সব ধরণের ছবি চাওয়ার কিওয়ার্ড সাপোর্ট
    const isImageRequest = /(ছবি|chobi|pic|picture|photo|image|কার্টুন|cartoon|draw|generate)/i.test(message || "");

    if (isImageRequest && !image) {
      try {
        const response = await ai.models.generateImages({
          model: "imagen-3.0-generate-002",
          prompt: message,
          config: {
            numberOfImages: 1,
            outputMimeType: "image/jpeg",
            aspectRatio: "1:1"
          }
        });

        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

        return res.json({ 
          reply: "আপনার ছবিটি তৈরি হয়েছে:",
          generatedImage: imageUrl 
        });
      } catch (imgErr) {
        console.error("Image generation failed:", imgErr);
        // যদি ফ্রি API Key-তে Imagen 3 সাপোর্ট না করে তবে আসল কারণ জানিয়ে দেবে
        return res.json({ 
          reply: `⚠️ ছবি তৈরিতে সমস্যা হয়েছে: ${imgErr.message || "Imagen 3 মডেলটি এই API Key দিয়ে অ্যাক্সেস করা যাচ্ছে না।"}` 
        });
      }
    }

    // সাধারণ চ্যাট ও ভিশন
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
    console.error("Server Error:", error);
    res.status(500).json({ reply: `সার্ভার সমস্যা: ${error.message}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
