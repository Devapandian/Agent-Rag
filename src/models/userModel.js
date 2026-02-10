/**
 * User Model
 * Represents the data structure and operations for Users.
 */

class User {
  constructor(id, name, email) {
    this.id = id;
    this.name = name;
    this.email = email;
  }
}

// In-memory data store for demonstration
const users = [
  new User(1, 'John Doe', 'john@example.com'),
  new User(2, 'Jane Smith', 'jane@example.com'),
];

const findById = (id) => {
  return users.find((user) => user.id === parseInt(id));
};

const getAll = () => {
  return users;
};

module.exports = {
  User,
  findById,
  getAll,
};
