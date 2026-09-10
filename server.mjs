import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
// ছবির সাইজ বড় হতে পারে তাই লিমিট বাড়ানো হয়েছে
app.use(express.json({ limit: "20mb" }));
app.use(express.static("public"));

// আপনার আসল API Key এখানে বসান
const ai = new GoogleGenAI();

app.post("/chat", async (req, res) => {
  try {
    const { message, image } = req.body;
    const contents = [];

    // ব্যবহারকারীর টেক্সট যোগ করা
    if (message) {
      contents.push({ text: message });
    }

    // যদি ছবি আপলোড করা হয়
    if (image && image.data && image.mimeType) {
      contents.push({
        inlineData: {
          data: image.data,
          mimeType: image.mimeType,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: contents,
      config: {
        systemInstruction: "তুমি একজন বিশেষজ্ঞ YouTube কন্টেন্ট ও থাম্বনেইল ডিজাইনার ক্রিয়েটর অ্যাসিস্ট্যান্ট। ছবি দিলে তার থাম্বনেইল কোয়ালিটি, কালার, টেক্সট বিশ্লেষণ করে বাংলায় বাস্তবসম্মত পরামর্শ দেবে।",
      },
    });

    res.json({ reply: response.text });
  } catch (error) {
    res.status(500).json({ reply: "ত্রুটি: " + error.message });
  }
});

app.listen(3000, () => {
  console.log("সার্ভার চালু হয়েছে: http://localhost:3000");
});
