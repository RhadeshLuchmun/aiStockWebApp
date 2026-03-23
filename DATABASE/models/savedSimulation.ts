import mongoose from 'mongoose';

const SavedSimulationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    dateSaved: { type: Date, default: Date.now },
    days: Number,
    paths: Number,
    initial_value: Number,
    expected_mean: Number,
    best_case_95: Number,
    var_95: Number,
    cvar_95: Number,
    sentiment: Number,
    start_regime: String,
    graph_base64: String // We save the image so they can view it later!
}, { timestamps: true });

export default mongoose.models.SavedSimulation || mongoose.model('SavedSimulation', SavedSimulationSchema);