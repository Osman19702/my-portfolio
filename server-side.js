/* const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(bodyParser.json());

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER_SECRET,
    pass: process.env.EMAIL_PASS_SECRET
  }
});

app.post('/submit-form', (req, res) => {
  const { name, email, subject, message } = req.body;
  const mailOptions = {
    from: process.env.EMAIL_USER_SECRET,
    to: process.env.EMAIL_USER_SECRET,
    subject: subject,
    html: `
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong> ${message}</p>
    `
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).send('Something went wrong');
    } else {
      console.log(`Email sent: ${info.response}`);
      res.status(200).send('Email sent');
    }
  });
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
 */