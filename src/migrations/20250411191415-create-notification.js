'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Notifications', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER,
            },
            subject_count: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
            direct_object_id: {
                type: Sequelize.INTEGER,
            },
            indirect_object_id: {
                type: Sequelize.INTEGER,
            },
            prep_object_id: {
                type: Sequelize.INTEGER,
            },
            type: {
                type: Sequelize.ENUM(
                    'like_video',
                    'like_comment',
                    'follow',
                    'follow_back',
                    'mention_comment',
                    'mention_video',
                    'reply_comment',
                    'comment_video'
                ),
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            is_read: {
                type: Sequelize.BOOLEAN,
            },
            unique_key: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Notifications');
    },
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('Notifications', 'type', {
            type: Sequelize.ENUM(
                'like_video',
                'like_comment',
                'follow',
                'follow_back',
                'mention_comment',
                'mention_video',
                'reply_comment',
                'comment_video'
            ),
            allowNull: false,
        });
    },
};
