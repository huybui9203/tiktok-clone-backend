import multer from 'multer';
const videoDest = 'src/public/videos';
const imageDest = 'src/public/images';

const storage = (dest) =>
    multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, dest);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix =
                Date.now() + '-' + Math.round(Math.random() * 1e9);
            const fileExt = file.originalname.split('.').pop();
            cb(null, `${file.fieldname}-${uniqueSuffix}.${fileExt}`);
        },
    });

const videoStorage = (dest) =>
    multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, dest);
        },
        filename: function (req, file, cb) {
            const { uploadId, chunk } = req.query;
            console.log(uploadId, chunk);
            const fileExt = file.originalname.split('.').pop();

            cb(null, `${uploadId}.part${chunk}.${fileExt}`);
        },
    });

const videoFileFilter = (req, file, cb) => {
    if (file.mimetype === 'video/mp4') {
        cb(null, true);
    } else {
        cb({ message: 'Unsupported File Format' }, false);
    }
};

const imageFileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb({ message: 'Unsupported File Format' }, false);
    }
};

const attachmentFilter = (req, file, cb) => {
    if (
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/png' ||
        file.mimetype === 'video/mp4'
    ) {
        cb(null, true);
    } else {
        cb({ message: 'Unsupported File Format' }, false);
    }
};

const videoMulter = multer({
    storage: videoStorage(videoDest),
    limits: {
        fieldNameSize: 200, //200 B
        fileSize: 100 * 1024 * 1024, //100 MB
    },
    fileFilter: videoFileFilter,
});

const imageMulter = multer({
    storage: storage(imageDest),
    limits: {
        fieldNameSize: 200, //200 B
        fileSize: 5 * 1024 * 1024, //5 MB
    },
    fileFilter: imageFileFilter,
});

const attachmentMulter = multer({
    storage: storage(imageDest),
    limits: {
        fieldNameSize: 200, //200 B
        fileSize: 100 * 1024 * 1024, //100 MB
    },
    fileFilter: attachmentFilter,
});

export { videoMulter, imageMulter, attachmentMulter };
