import { create } from "zustand";
import userSlice from './slices/user.slice.js';
import pipelineSlice from './slices/pipeline.slice.js';
import formSlice from './slices/form.slice.js';
import submissionSlice from './slices/submission.slice.js';
import sectionSlice from './slices/section.slice.js';

// Combine all slices in the store:
const useStore = create((...args) => ({
  ...userSlice(...args),
  ...pipelineSlice(...args),
  ...formSlice(...args),
  ...submissionSlice(...args),
  ...sectionSlice(...args)
}));


export default useStore;
