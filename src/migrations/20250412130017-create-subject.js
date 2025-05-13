'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(
            'Subjects',
            {
                id: {
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
                    type: Sequelize.INTEGER,
                },
                object_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    unique: 'subject_unique_constraint',
                },
                name: {
                    type: Sequelize.STRING,
                },
                type: {
                    type: Sequelize.ENUM('user', 'video', 'comment'),
                    allowNull: false,
                    unique: 'subject_unique_constraint',
                },
                image_url: {
                    type: Sequelize.STRING,
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
                    subject_unique_constraint: {
                        fields: ['object_id', 'type'],
                    },
                },
            }
        );
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Subjects');
    },

    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Subjects', 'object_link', {
            type: Sequelize.STRING,
        });
    },
};
