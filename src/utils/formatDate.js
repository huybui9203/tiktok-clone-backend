const formatDate = (date) => {
    const utcDate = new Date(date)
    const timezoneOffset = utcDate.getTimezoneOffset() //minutes
    const localTime = new Date(utcDate.getTime() - timezoneOffset * 60 * 1000);

    return localTime.toISOString().replace('T', ' ').substring(0, 19);
};

export default formatDate;
