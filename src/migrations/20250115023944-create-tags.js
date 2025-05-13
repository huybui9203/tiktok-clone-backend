'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(
            'Tags',
            {
                id: {
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
                    type: Sequelize.INTEGER,
                },
                start: {
                    type: Sequelize.INTEGER,
                },
                end: {
                    type: Sequelize.INTEGER,
                },
                tag_name: {
                    type: Sequelize.STRING,
                },
                taggable_type: {
                    type: Sequelize.STRING,
                },
                taggable_id: {
                    type: Sequelize.INTEGER,
                },
                createdAt: {
                    allowNull: false,
                    type: Sequelize.DATE,
                },
                updatedAt: {
                    allowNull: false,
                    type: Sequelize.DATE,
                },
            },
            {
                uniqueKeys: {
                    tag_unique_constraint: {
                        fields: ['start', 'end', 'taggable_id', 'taggable_type'],
                    },
                },
            }
        );
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Tags');
    },
};
