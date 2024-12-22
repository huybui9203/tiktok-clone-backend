// import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { videoMulter, imageMulter } from '~/config/multer';
import cloudinary from '~/config/cloudinary';

const videoMulterUpload = videoMulter.single('video');
const imageMulterUpload = imageMulter.single('image');

const folderOnCloud = {
    video: 'tiktok-clone/videos',
    image: 'tiktok-clone/images',
};

const uploadImageToCloud = async (file) => {
    const result = await cloudinary.uploader
        .upload(file, {
            folder: folderOnCloud.image,
            resource_type: 'image',
            format: 'jpg',
            eager: [
                {
                    width: 120,
                    height: 120,
                    crop: 'fill',
                    gravity: 'center',
                    quality: 'auto',
                },
            ],
            transformation: {
                width: 300,
                height: 300,
                crop: 'fill',
                gravity: 'center',
                quality: 'auto',
            },
        })
        .then((image) => [undefined, image])
        .catch((err) => [err, undefined]);

    return result;
};

const uploadCoverToCloud = async (file) => {
    const result = await cloudinary.uploader
        .upload(file, {
            folder: folderOnCloud.image,
            resource_type: 'image',
            format: 'jpg',

            transformation: [
                { quality: 'auto' },
                { if: 'w_gt_1080' },
                { width: 1080 },
                { if: 'end' },
                { if: 'h_gt_1920' },
                { height: 1920 },
                { if: 'end' },
            ],
        })
        .then((image) => [undefined, image])
        .catch((err) => [err, undefined]);

    return result;
};

const uploadVideoToCloud = async (file) => {
    const result = await cloudinary.uploader
        .upload(file, {
            folder: folderOnCloud.video,
            resource_type: 'video',
            format: 'mp4',
            // eager: [
            //     {
            //         width: 120,
            //         // height: 120,
            //         // crop: 'fill',
            //         // gravity: 'center',
            //         quality: 'auto',
            //         // duration: '5',
            //         video_codec: 'h264',
            //     },
            // ],
            transformation: [
                {
                    video_codec: 'h264',
                    quality: 'auto',
                    // streaming_profile: 'auto', //Adaptive bitrate streaming
                },
                { if: 'w_gt_1080' },
                { width: 1080 },
                { if: 'end' },
                { if: 'h_gt_1920' },
                { height: 1920 },
                { if: 'end' },
            ],
        })
        .then((video) => [undefined, video])
        .catch((err) => [err, undefined]);

    return result;
};

const destroyImage = async (publicId) => {
    const result = await cloudinary.uploader
        .destroy(publicId, {
            resource_type: 'image',
        })
        .catch((err) => console.log(err));
    return result;
};

export {
    videoMulterUpload,
    imageMulterUpload,
    uploadImageToCloud,
    uploadVideoToCloud,
    uploadCoverToCloud,
    destroyImage,
};
