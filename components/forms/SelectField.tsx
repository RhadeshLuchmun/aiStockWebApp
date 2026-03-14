'use client'

import { Label } from "@/components/ui/label"
import { Controller } from "react-hook-form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const SelectField = ({
                         name,
                         label,
                         placeholder,
                         options,
                         control,
                         error,
                         required = false,
                     }: SelectFieldProps) => {
    return (
        <div className="flex flex-col gap-2 mb-5">
            <Label htmlFor={name} className="form-label">
                {label}
            </Label>

            <Controller
                name={name}
                control={control}
                rules={{
                    required: required ? `Please select ${label.toLowerCase()}` : false,
                }}
                render={({ field }) => (
                    <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                    >
                        <SelectTrigger className="select-trigger">
                            <SelectValue placeholder={placeholder} />
                        </SelectTrigger>

                        <SelectContent className="bg-gray-900 border border-gray-700 text-white z-50">
                            {options.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    className="hover:bg-gray-700 focus:bg-gray-700"
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            />

            {error && (
                <p className="text-sm text-red-500 mt-1">
                    {error.message || `${label} is required`}
                </p>
            )}
        </div>
    )
}

export default SelectField