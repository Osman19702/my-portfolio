/* // Select the notification element
const notification = document.querySelector('#notification');

// Define a function to show the notification
function showNotification(message, type) {
  // Set the text content of the notification
  const notificationText = document.querySelector('#notification-text');
  notificationText.textContent = message;

  // Set the background color of the notification based on the type
  if (type === 'success') {
    notification.style.backgroundColor = '#4CAF50';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#f44336';
  } else {
    notification.style.backgroundColor = '#333';
  }

  // Show the notification
  notification.classList.add('show');

  // Hide the notification after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
} */