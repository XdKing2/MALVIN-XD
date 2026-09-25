const { DATABASE } = require('./db');
const { DataTypes } = require('sequelize');

const NotesDB = DATABASE.define('UserNote', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userJid: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    noteNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
}, {
    tableName: 'user_notes',
    timestamps: true,
    indexes: [
        { fields: ['userJid', 'noteNumber'], unique: true }
    ]
});

async function initNotesDB() {
    await NotesDB.sync();
}

async function addNote(userJid, content) {
    await initNotesDB();
    const lastNote = await NotesDB.findOne({
        where: { userJid },
        order: [['noteNumber', 'DESC']]
    });
    const noteNumber = lastNote ? lastNote.noteNumber + 1 : 1;
    
    const note = await NotesDB.create({
        userJid,
        noteNumber,
        content
    });
    return note;
}

async function getNote(userJid, noteNumber) {
    await initNotesDB();
    return await NotesDB.findOne({
        where: { userJid, noteNumber }
    });
}

async function getAllNotes(userJid) {
    await initNotesDB();
    return await NotesDB.findAll({
        where: { userJid },
        order: [['noteNumber', 'ASC']]
    });
}

async function updateNote(userJid, noteNumber, newContent) {
    await initNotesDB();
    const note = await NotesDB.findOne({
        where: { userJid, noteNumber }
    });
    if (!note) return null;
    
    note.content = newContent;
    await note.save();
    return note;
}

async function deleteNote(userJid, noteNumber) {
    await initNotesDB();
    const result = await NotesDB.destroy({
        where: { userJid, noteNumber }
    });
    
    if (result > 0) {
        await renumberNotes(userJid);
    }
    
    return result > 0;
}

async function renumberNotes(userJid) {
    await initNotesDB();
    const notes = await NotesDB.findAll({
        where: { userJid },
        order: [['noteNumber', 'ASC']]
    });
    
    for (let i = 0; i < notes.length; i++) {
        const newNumber = i + 1;
        if (notes[i].noteNumber !== newNumber) {
            notes[i].noteNumber = newNumber;
            await notes[i].save();
        }
    }
}

async function deleteAllNotes(userJid) {
    await initNotesDB();
    const result = await NotesDB.destroy({
        where: { userJid }
    });
    return result;
}

async function getAllUsersNotes() {
    await initNotesDB();
    return await NotesDB.findAll({
        order: [['userJid', 'ASC'], ['noteNumber', 'ASC']]
    });
}

async function deleteNoteById(id) {
    await initNotesDB();
    const result = await NotesDB.destroy({
        where: { id }
    });
    return result > 0;
}

async function updateNoteById(id, newContent) {
    await initNotesDB();
    const note = await NotesDB.findByPk(id);
    if (!note) return null;
    
    note.content = newContent;
    await note.save();
    return note;
}

module.exports = {
    initNotesDB,
    addNote,
    getNote,
    getAllNotes,
    updateNote,
    deleteNote,
    deleteAllNotes,
    getAllUsersNotes,
    deleteNoteById,
    updateNoteById,
    NotesDB,
};
