'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(
            'Reactions',
            {
                id: {
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
                    type: Sequelize.INTEGER,
                },
                user_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'Users',
                        key: 'id',
                    },
                    unique: 'react_unique_constraint',
                    onDelete: 'CASCADE',
                },
                reactable_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    unique: 'react_unique_constraint',
                },
                reactable_type: {
                    type: Sequelize.ENUM('message'),
                    allowNull: false,
                    unique: 'react_unique_constraint',
                },
                type: {
                    type: Sequelize.ENUM(
                        'like',
                        'love',
                        'haha',
                        'sad',
                        'angry'
                    ),
                    allowNull: false,
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
                    react_unique_constraint: {
                        fields: ['user_id', 'reactable_id', 'reactable_type'],
                    },
                },
            }
        );
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Reactions');
    },
};
