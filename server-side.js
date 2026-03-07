const path = require('path');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3000;
const staticRoot = __dirname;
const emailUser = process.env.EMAIL_USER_SECRET;
const emailPass = process.env.EMAIL_PASS_SECRET;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(staticRoot));

app.get('/', (req, res) => {
  res.sendFile(path.join(staticRoot, 'index.html'));
});

app.post('/submit-form', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).send('Missing required fields');
  }

  if (!emailUser || !emailPass) {
    console.log('Form submission received without mail credentials configured.');
    console.log({ name, email, subject, message });
    return res.status(200).send('Form received locally');
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    await transporter.sendMail({
      from: emailUser,
      to: emailUser,
      subject,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong> ${message}</p>
      `,
    });

    return res.status(200).send('Email sent');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Something went wrong');
  }
});

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});