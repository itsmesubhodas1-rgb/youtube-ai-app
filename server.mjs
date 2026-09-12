import express from "express";
import { GoogleGenAI } from "@google/genai";
import path from "path";
const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.static("public"));
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.json([{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.onrender.youtube_ai_app.twa",
      "sha256_cert_fingerprints": ["8D:40:A0:48:CD:BE:E4:AB:A8:D3:2C:3E:85:98:86:9F:99:36:94:29:66:FF:E3:CC:35:14:8C:A3"]
    }
  }]);
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/chat", async (req, res) => {
  try {
    const { message, image, language = "Bengali", aspectRatio = "1:1" } = req.body;

    const isImageRequest = /(ছবি|chobi|pic|picture|photo|image|কার্টুন|cartoon|draw|generate)/i.test(message || "");

    
    if (isImageRequest && !image) {
      try {
        const promptGen = await ai.models.generateContent({
         model: "gemini-3.6-flash",
          contents: [
            `Translate and expand this user request into a masterpiece, highly detailed, photorealistic 4K/8K resolution English image prompt. Include ultra-detailed textures, cinematic lighting, sharp focus, 3D cartoon or digital art style: "${message}"`
          ]
        });
        const refinedPrompt = promptGen.text ? promptGen.text.trim().replace(/[\n\r]+/g, " ") : message;
        
        // রেজোলিউশন নির্ধারণ
        let width = 1920;
        let height = 1920;
        if (aspectRatio === "9:16") {
          width = 768;
          height = 1344;
        } else if (aspectRatio === "16:9") {
          width = 1344;
          height = 768;
        }

        const seed = Math.floor(Math.random() * 1000000);
        const encodedPrompt = encodeURIComponent(refinedPrompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=flux&enhance=true&nologo=true`;

        const replyMsg = language === "English" 
          ? "🎨 Your image has been generated!" 
          : (language === "Hindi" ? "🎨 आपकी छवि तैयार कर दी गई है!" : "🎨 আপনার ছবিটি তৈরি করা হয়েছে!");

        return res.json({ 
          reply: replyMsg,
          generatedImage: imageUrl 
        });
      } catch (imgErr) {
        console.error("Image Error:", imgErr);
        return res.json({ reply: `ছবি তৈরিতে সমস্যা হয়েছে: ${imgErr.message}` });
      }
    }

    // সাধারণ চ্যাট ও থাম্বনেইল ভিশন
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
      parts.push(`You are an expert YouTube AI Assistant. You must reply strictly in ${language}. User query: ${message}`);
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
