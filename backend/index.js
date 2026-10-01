import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

import loginComponent from './src/components/Login.js';
import registerComponent from './src/components/Register.js';
import appAuthComponent from './src/components/AppAuth.js';
import adminDashboardComponent from './src/components/admin/AdminDashboard.js';
import adminPricingComponent from './src/components/admin/AdminPricing.js';
import adminReportsComponent from './src/components/admin/AdminReports.js';
import adminUsersComponent from './src/components/admin/AdminUsers.js';
import adminZonesComponent from './src/components/admin/AdminZones.js';
import staffCameraComponent from './src/components/staff/StaffCamera.js';
import staffCheckinComponent from './src/components/staff/StaffCheckin.js';
import staffDashboardComponent from './src/components/staff/StaffDashboard.js';
import staffExceptionsComponent from './src/components/staff/StaffExceptions.js';
import staffSlotMapComponent from './src/components/staff/StaffSlotMap.js';
import staffSupportComponent from './src/components/staff/StaffSupport.js';
import dashboardComponent from './src/components/user/Dashboard.js';
import userPaymentComponent from './src/components/user/UserPayment.js';
import userSlotPickerComponent from './src/components/user/UserSlotPicker.js';
import vehicleDialogComponent from './src/components/user/VehicleDialog.js';
import slotInfoDialogComponent from './src/components/shared/SlotInfoDialog.js';

app.use('/api/components/Login', loginComponent);
app.use('/api/components/Register', registerComponent);
app.use('/api/components/AppAuth', appAuthComponent);
app.use('/api/components/admin/AdminDashboard', adminDashboardComponent);
app.use('/api/components/admin/AdminPricing', adminPricingComponent);
app.use('/api/components/admin/AdminReports', adminReportsComponent);
app.use('/api/components/admin/AdminUsers', adminUsersComponent);
app.use('/api/components/admin/AdminZones', adminZonesComponent);
app.use('/api/components/staff/StaffCamera', staffCameraComponent);
app.use('/api/components/staff/StaffCheckin', staffCheckinComponent);
app.use('/api/components/staff/StaffDashboard', staffDashboardComponent);
app.use('/api/components/staff/StaffExceptions', staffExceptionsComponent);
app.use('/api/components/staff/StaffSlotMap', staffSlotMapComponent);
app.use('/api/components/staff/StaffSupport', staffSupportComponent);
app.use('/api/components/user/Dashboard', dashboardComponent);
app.use('/api/components/user/UserPayment', userPaymentComponent);
app.use('/api/components/user/UserSlotPicker', userSlotPickerComponent);
app.use('/api/components/user/VehicleDialog', vehicleDialogComponent);
app.use('/api/components/shared/SlotInfoDialog', slotInfoDialogComponent);app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
