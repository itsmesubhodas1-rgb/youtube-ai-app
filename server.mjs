import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.static("public"));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/chat", async (req, res) => {
  try {
    const { message, image, language = "Bengali" } = req.body;

    const isImageRequest = /(ছবি|chobi|pic|picture|photo|image|কার্টুন|cartoon|draw|generate)/i.test(message || "");

    // ছবি তৈরির অনুরোধ
    if (isImageRequest && !image) {
      try {
        const promptGen = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: [
            `Translate and expand this user request into a concise English image prompt for high-quality 3D cartoon render or digital art: "${message}". Return ONLY the English prompt, nothing else.`
          ]
        });

        const refinedPrompt = promptGen.text ? promptGen.text.trim().replace(/[\n\r]+/g, " ") : message;
        
        const seed = Math.floor(Math.random() * 1000000);
        const encodedPrompt = encodeURIComponent(refinedPrompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true`;

        const replyMsg = language === "English" ? "🎨 Your image has been generated!" : (language === "Hindi" ? "🎨 आपकी छवि तैयार कर दी गई है!" : "🎨 আপনার ছবিটি তৈরি করা হয়েছে!");

        return res.json({ 
          reply: replyMsg,
          generatedImage: imageUrl 
        });
      } catch (imgErr) {
        console.error("Image Error:", imgErr);
        return res.json({ reply: `ছবি তৈরিতে সমস্যা হয়েছে: ${imgErr.message}` });
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
      parts.push(`You are a YouTube AI Assistant. You must reply strictly in ${language}. User query: ${message}`);
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
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
