const axios = require('axios');

const wordCache = new Map();

async function isValidEnglishWord(word) {
    const cleanWord = word.toLowerCase().trim();
    
    if (cleanWord.length < 2) return false;
    
    if (wordCache.has(cleanWord)) {
        return wordCache.get(cleanWord);
    }
    
    try {
        const response = await axios.get(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`,
            { timeout: 5000 }
        );
        
        const isValid = response.status === 200 && Array.isArray(response.data) && response.data.length > 0;
        wordCache.set(cleanWord, isValid);
        return isValid;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            wordCache.set(cleanWord, false);
            return false;
        }
        console.log(`Dictionary API error for "${cleanWord}":`, error.message);
        return true;
    }
}

module.exports = {
    isValidEnglishWord
};
