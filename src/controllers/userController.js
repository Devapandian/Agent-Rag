const userModel = require('../models/userModel');

/**
 * User Controller
 * Logic for handling user-related requests.
 */

exports.getUsers = (req, res) => {
    const users = userModel.getAll();
    res.json({
        status: 'success',
        data: users,
    });
};

exports.getUser = (req, res) => {
    const id = req.params.id;
    const user = userModel.findById(id);

    if (!user) {
        return res.status(404).json({
            status: 'fail',
            message: 'User not found',
        });
    }

    res.json({
        status: 'success',
        data: user,
    });
};
