import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { FileSpreadsheet, Pencil } from "lucide-react";

const statusStyles = {
  present: "bg-emerald-50 text-emerald-700 border-emerald-200",
  absent: "bg-rose-50 text-rose-700 border-rose-200",
  late: "bg-orange-50 text-orange-700 border-orange-200",
  half_day: "bg-amber-50 text-amber-700 border-amber-200",
  on_leave: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function AttendanceReportTable({ attendance, onEdit, isEditing }) {
  const [editDialog, setEditDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editData, setEditData] = useState({});

  const handleEditClick = (record) => {
    setSelectedRecord(record);
    setEditData({
      clock_in: formatTimeInput(record.first_check_in),
      clock_out: formatTimeInput(record.last_check_out),
      status: record.status || "present",
      notes: record.notes || "",
    });
    setEditDialog(true);
  };

  const handleSaveEdit = () => {
    onEdit(selectedRecord.id, editData);
    setEditDialog(false);
  };

  return (
    <>
      <Card className="border border-lime-400/15 bg-black">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-white">
            <FileSpreadsheet className="w-5 h-5 text-lime-300" />
            Attendance Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-lime-100/35">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  attendance.map((record, index) => (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className="border-b hover:bg-black transition-colors"
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.employee_name}</p>
                          <p className="text-sm text-lime-100/50">{record.employee_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{format(parseISO(record.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{formatDisplayTime(record.first_check_in)}</TableCell>
                      <TableCell>{formatDisplayTime(record.last_check_out)}</TableCell>
                      <TableCell>
                        {Number(record.work_hours) > 0 ? (
                          <span className="font-medium text-lime-300">
                            {Number(record.work_hours).toFixed(1)}h
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusStyles[record.status]} border capitalize`}>
                          {record.status?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditClick(record)}
                          className="text-lime-100/50 hover:text-lime-300"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Attendance</DialogTitle>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-lime-100/50">
                {selectedRecord.employee_name} - {format(parseISO(selectedRecord.date), "MMMM d, yyyy")}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Clock In</Label>
                  <Input
                    type="time"
                    value={editData.clock_in}
                    onChange={(e) => setEditData({ ...editData, clock_in: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Clock Out</Label>
                  <Input
                    type="time"
                    value={editData.clock_out}
                    onChange={(e) => setEditData({ ...editData, clock_out: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editData.status}
                  onValueChange={(value) => setEditData({ ...editData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="Add any notes..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setEditDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isEditing}
                  className="flex-1 bg-lime-400 hover:bg-lime-300"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatTimeInput(value) {
  if (!value) return "";
  try {
    return format(new Date(value), "HH:mm");
  } catch {
    return "";
  }
}

function formatDisplayTime(value) {
  if (!value) return "-";
  try {
    return format(new Date(value), "hh:mm a");
  } catch {
    return "-";
  }
}
