const password = (value, helpers) => {
    if (value.length < 8) {
        return helpers.message('Password must be at least 8 characters');
    }

    if (value.length > 20) {
        return helpers.message('Password must not exceed 20 characters');
    }
    if (
        !(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/).test(
            value
        )
    ) {
        return helpers.message(
            'Password must contain letters, numbers, and special characters'
        );
    }
    return value;
};

export { password };
