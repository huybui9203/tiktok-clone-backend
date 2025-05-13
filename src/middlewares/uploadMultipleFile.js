import { StatusCodes } from 'http-status-codes';
import fs from 'fs';
import multer from 'multer';
import ApiError from '~/utils/ApiError';
import { attachmentMulterUpload } from '~/utils/uploadFile';

const uploadMutipleFile = {
    //image or video
    attachments(req, res, next) {
        attachmentMulterUpload(req, res, (err) => {
            //parser form-data
            if (err instanceof multer.MulterError) {
                next(
                    new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, err.message)
                );
                return;
            } else if (err) {
                next(
                    new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, err.message)
                );
                return;
            }

            const arrayFiles = req.files || [];
            for (const file of arrayFiles) {
                if (
                    file.mimetype.split('/')[0] === 'image' &&
                    file.size > 5 * 1024 * 1024
                ) {
                    next(
                        new ApiError(
                            StatusCodes.UNPROCESSABLE_ENTITY,
                            'The image must not exceed 5 MB'
                        )
                    );
                    arrayFiles.forEach((file) => {
                        fs.unlinkSync(file.path);
                    });
                    return;
                }
            }
            req.arrayFiles = arrayFiles.map((file) => ({
                path: file.path,
                type: file.mimetype.split('/')[0],
            }));
            next();
        });
    },
};

export default uploadMutipleFile;
