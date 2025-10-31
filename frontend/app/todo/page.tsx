"use client";

import { StudentHeader } from '../../components/student/StudentHeader';
import { TodoWidget } from '../../components/student/TodoWidget';
import { RoleGate } from '../../components/RoleGate';

const TodoPage = () => {
  return (
    <RoleGate roles={["student"]}>
      <div className="space-y-4">
        <StudentHeader title="To-Do List" />
        <TodoWidget large />
      </div>
    </RoleGate>
  );
};

export default TodoPage;
