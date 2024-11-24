import { useState } from 'react';
import { Button, Modal, Form, InputGroup, ListGroup, Card } from 'react-bootstrap';
import useStore from '../../zustand/store';

export default function AddUserToPipeline({ pipelineId, initialPipelineStatusId }) {
  const selectedPipelineWithData = useStore((state) => state.selectedPipeline);
  const foundUsers = useStore((state) => state.foundUsers);
  const searchingApplicant = useStore((state) => state.searchingApplicant);
  const setSelectedUserId = useStore((state) => state.setSelectedUserId);
  const addUserStatus = useStore((state) => state.addUserStatus);

  const [showModal, setShowModal] = useState(false);
  const [searchString, setSearchString] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const closeModal = () => {
    setShowModal(false);
    setSearchString('');
    setSelectedUser(null);
    searchingApplicant('');
  };

  const openModal = () => {
    setShowModal(true);
  };

  const searchQuery = () => {
    searchingApplicant(searchString);
  };

  const addUserToPipeline = () => {
    if (!selectedPipelineWithData || Object.keys(selectedPipelineWithData).length === 0) {
      alert('Please select a pipeline');
      return;
    }

    if (!selectedUser) {
      alert('Please select a user');
      return;
    }

    const newUserStatus = {
      pipeline_id: pipelineId,
      user_id: selectedUser.id,
      pipeline_status_id: initialPipelineStatusId,
    };
    addUserStatus(newUserStatus);
    setSearchString('');
    setSelectedUser(null);
    setShowModal(false);
    searchingApplicant('');
  };

  let usersAvailableToAdd = [];
  if (foundUsers.length > 0) {
    const unfilteredUsers = selectedPipelineWithData.statuses.map((status) => status.applicants).flat().filter((user) => user);
    console.log('unfilteredUsers', unfilteredUsers);
    console.log('foundUsers', foundUsers);
    usersAvailableToAdd = foundUsers.filter((user) => !unfilteredUsers.some((u) => u.id === user.id));
  }

  return (
    <>
      <Button onClick={openModal}>Add User</Button>

      <Modal show={showModal} onHide={closeModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add User to Pipeline</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <InputGroup className="mb-3">
              <Form.Control
                type="text"
                placeholder="Search for user"
                value={searchString}
                onChange={(e) => setSearchString(e.target.value)}
              />
              <Button variant="outline-primary" onClick={searchQuery}>
                Search
              </Button>
            </InputGroup>
          </Form>

          {usersAvailableToAdd.length > 0 ? (
            <ListGroup>
              {usersAvailableToAdd.map((user) => (
                <ListGroup.Item
                  key={user.id}
                  action
                  active={selectedUser?.id === user.id}
                  onClick={() => setSelectedUser(user)}
                  className="d-flex justify-content-between align-items-center"
                >
                  <div>
                    <strong>
                      {user.first_name} {user.last_name}
                    </strong>
                    <br />
                    <small>{user.email}</small>
                  </div>
                  <div>
                    <Button variant="link" size="sm" onClick={() => setSelectedUser(user)}>
                      Select
                    </Button>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <Card className="text-center">
              <Card.Body>
                <Card.Text>No users found. Try a different search term.</Card.Text>
              </Card.Body>
            </Card>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            Close
          </Button>
          <Button variant="primary" onClick={addUserToPipeline} disabled={!selectedUser}>
            Add User
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}