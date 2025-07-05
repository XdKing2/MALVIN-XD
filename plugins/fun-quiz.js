/* const axios = require('axios');
const { malvin } = require('../malvin');

malvin({
  pattern: 'quiz',
  alias: ['q'],
  desc: 'Fetches a quiz question from an API and presents it to the user.',
  category: 'utility',
  use: '.quiz',
  filename: __filename,
}, async (conn, mek, msg, { from, args, reply }) => {
  try {
    // Fetch a quiz question from the API
    const response = await axios.get('https://the-trivia-api.com/v2/questions?limit=1');
    const questionData = response.data[0];

    if (!questionData) {
      return reply('❌ Failed to fetch a quiz question. Please try again later.');
    }

    const { question, correctAnswer, incorrectAnswers } = questionData;
    const options = [...incorrectAnswers, correctAnswer];
    shuffleArray(options);

    // Send the question and options to the user
    const optionsText = options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join('\n');
    await reply(`🎯 *Question:* ${question.text}\n\n${optionsText}\n\nYou have 10 seconds to answer. Reply with the letter corresponding to your choice.`);

    // Set a timeout to handle the 10-second response window
    const timeout = setTimeout(() => {
      reply(`⏰ Time's up! The correct answer was: ${correctAnswer}`);
    }, 10000);

    // Listen for the user's response
    const filter = (response) => response.key.from === from && /^[A-Da-d]$/.test(response.text);
    const collected = await conn.awaitMessages({ filter, time: 10000, max: 1 });

    clearTimeout(timeout);

    if (collected.size === 0) {
      return reply(`⏰ Time's up! The correct answer was: ${correctAnswer}`);
    }

    const userAnswer = collected.first().text.toUpperCase();
    const isCorrect = options[userAnswer.charCodeAt(0) - 65] === correctAnswer;

    if (isCorrect) {
      return reply('✅ Correct!');
    } else {
      return reply(`❌ Incorrect. The correct answer was: ${correctAnswer}`);
    }
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    reply('❌ Failed to fetch quiz data. Please try again later.');
  }
});

// Shuffle an array in place
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
*/

const axios = require('axios');
const { malvin } = require('../malvin');

malvin({
  pattern: 'quiz',
  alias: ['q'],
  desc: 'Fetches a quiz question from an API and presents it to the user.',
  category: 'fun',
  use: '.quiz',
  filename: __filename,
}, async (conn, mek, msg, { from, args, reply }) => {
  try {
    // Fetch a quiz question from the API
    const response = await axios.get('https://the-trivia-api.com/v2/questions?limit=1');
    const questionData = response.data[0];

    if (!questionData) {
      return reply('❌ Failed to fetch a quiz question. Please try again later.');
    }

    const { question, correctAnswer, incorrectAnswers } = questionData;
    const options = [...incorrectAnswers, correctAnswer];
    shuffleArray(options);

    // Send the question and options to the user
    const optionsText = options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join('\n');
    await reply(`🎯 *Question:* ${question.text}\n\n${optionsText}\n\nYou have 20 seconds to answer. Reply with the letter corresponding to your choice.`);

    // Set a timeout to handle the 20-second response window
    const timeout = setTimeout(() => {
      reply(`⏰ Time's up! The correct answer was: ${correctAnswer}`);
    }, 20000);

    // Listen for the user's response
    const filter = (response) => response.key.from === from && /^[A-Da-d]$/.test(response.text);
    const collected = await conn.awaitMessages({ filter, time: 20000, max: 1 });

    clearTimeout(timeout);

    if (collected.size === 0) {
      return reply(`⏰ Time's up! The correct answer was: ${correctAnswer}`);
    }

    const userAnswer = collected.first().text.toUpperCase();
    const isCorrect = options[userAnswer.charCodeAt(0) - 65] === correctAnswer;

    if (isCorrect) {
      return reply('✅ Correct!');
    } else {
      return reply(`❌ Incorrect. The correct answer was: ${correctAnswer}`);
    }
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    reply('❌ Failed to fetch quiz data. Please try again later.');
  }
});

// Shuffle an array in place
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

