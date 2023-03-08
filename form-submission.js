/* const form = document.querySelector('form');
const submitButton = document.querySelector('#submit-btn');

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.querySelector('#name').value;
  const email = document.querySelector('#email').value;
  const subject = document.querySelector('#subject').value;
  const message = document.querySelector('#message').value;

  const formData = new FormData();
  formData.append('name', name);
  formData.append('email', email);
  formData.append('subject', subject);
  formData.append('message', message);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/submit-form');
  xhr.setRequestHeader('Accept', 'application/json');
  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        showNotification('Your message was sent successfully!', 'success');
        form.reset();

        // Send email using SendGrid API
        const emailData = {
          personalizations: [
            {
              to: [{ email: 'oturaliogluetu@gmail.com@gmail.com' }]
            }
          ],
          from: {
            email: email,
            name: name
          },
          subject: subject,
          content: [
            {
              type: 'text/plain',
              value: message
            }
          ]
        };
        const apiKey = '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';
        const request = new XMLHttpRequest();
        request.open('POST', 'https://api.sendgrid.com/v3/mail/send');
        request.setRequestHeader('Authorization', `Bearer ${apiKey}`);
        request.onreadystatechange = () => {
          if (request.readyState === XMLHttpRequest.DONE) {
            if (request.status === 202) {
              console.log('Email sent!');
            } else {
              console.error('Failed to send email:', request.responseText);
            }
          }
        };
        request.send(JSON.stringify(emailData));
      } else if (xhr.status === 405) {
        showNotification('Method not allowed. Please contact the website owner!', 'error');
      } else {
        showNotification('Something went wrong. Please try again later!', 'error');
      }
    }
  };
  
  xhr.send(formData);
});
 */

const form = document.querySelector('form');
const submitButton = document.querySelector('#submit-btn');

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.querySelector('#name').value;
  const email = document.querySelector('#email').value;
  const subject = document.querySelector('#subject').value;
  const message = document.querySelector('#message').value;

  const emailData = {
    personalizations: [
      {
        to: [{ email: 'oturaliogluetu@gmail.com' }]
      }
    ],
    from: {
      email: email,
      name: name
    },
    subject: subject,
    content: [
      {
        type: 'text/plain',
        value: message
      }
    ]
  };
  const apiKey = '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';
  const request = new XMLHttpRequest();
  request.open('POST', 'https://api.sendgrid.com/v3/mail/send');
  request.setRequestHeader('Authorization', `Bearer ${apiKey}`);
  request.setRequestHeader('Content-Type', 'application/json');
  request.onreadystatechange = () => {
    if (request.readyState === XMLHttpRequest.DONE) {
      if (request.status === 202) {
        showNotification('Your message was sent successfully!', 'success');
        form.reset();
      } else {
        showNotification('Something went wrong. Please try again later!', 'error');
      }
    }
  };
  request.send(JSON.stringify(emailData));
});
