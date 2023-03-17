/* const form = document.getElementById('contact-form');
const name = document.getElementById('name');
const email = document.getElementById('email');
const subject = document.getElementById('subject');
const message = document.getElementById('message');

form.addEventListener('submit', function(event) {
  event.preventDefault();
  const data = {
    name: name.value,
    email: email.value,
    subject: subject.value,
    message: message.value
  };
  fetch('http://localhost:3000/submit-form', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(response => {
    if (response.ok) {
      showNotification('Your message was sent successfully!', 'success');
    } else {
      showNotification('Something went wrong. Please try again later!', 'error');
    }
  })
  .catch(error => {
    console.error(error);
    showNotification('Something went wrong. Please try again later!', 'error');
  });
});
 */