require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: "https://skorbota-ritual.com.ua"
}));

app.use(express.json());

// ======================
// MongoDB
// ======================

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// ======================
// Model
// ======================

const Post = mongoose.model("Post", {
  username: String,
  email: String,
  comment: String,
  phone: String,
});

// ======================
// Mail transporter
// ======================

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_LOGIN,
    pass: process.env.BREVO_KEY
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.log("SMTP ERROR:", error);
  } else {
    console.log("SMTP READY");
  }
});

// ======================
// GET posts
// ======================

app.get("/posts", async (req, res) => {
  try {
    const posts = await Post.find().select("-phone");
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// CREATE post
// ======================

app.post("/posts", async (req, res) => {

  console.log(req.body);

  try {
    const { username, email, comment, phone } = req.body;

    if (!username || !email || !comment || !phone) {
      return res.status(400).json({
        error: "Заповніть всі поля"
      });
    }

    const post = new Post({
      username,
      email,
      comment,
      phone
    });

    await post.save();

    await transporter.sendMail({
      from: '"Skorbota" <noreply@skorbota-ritual.com.ua>',
      to: process.env.EMAIL_USER_TO,
      subject: "Новий відгук",
      html: `
        <h2>Новий коментар</h2>

        <p><b>Ім'я:</b> ${username}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Телефон:</b> ${phone}</p>
        <p><b>Коментар:</b> ${comment}</p>
      `
    });

    console.log("EMAIL SENT");

    res.json({
      status: "success",
      post: {
        username: post.username,
        email: post.email,
        comment: post.comment
      }
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: "Server error"
    });
  }
});

// ======================
// SEND modal form
// ======================

app.post("/send", async (req, res) => {

  console.log(req.body);

  try {

    const { name, email, phone, product } = req.body;

    await transporter.sendMail({
      from: "Skorbota <mutro2003@gmail.com>",
      to: process.env.EMAIL_USER_TO,
      subject: "Нове замовлення",
      html: `
        <h2>Нове замовлення</h2>

        <p><b>Ім'я:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Телефон:</b> ${phone}</p>
        <p><b>Товар:</b> ${product}</p>
      `
    });

    console.log("EMAIL SENT");

   res.json({
  status: "success"
});

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Помилка сервера"
    });
  }
});

// ======================
// Start server
// ======================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});