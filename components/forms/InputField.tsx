'use client'

import React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const InputField = ({
                        name,
                        label,
                        placeholder,
                        type = "text",
                        register,
                        error,
    value,
                        validation,
                        disabled,
                    }: FormInputProps) => {
    return (
        <div className="flex flex-col gap-2 mb-5">
            <Label htmlFor={name} className="form-label">
                {label}
            </Label>

            <Input
                id={name}
                type={type}
                placeholder={placeholder}
                disabled={disabled}
                value={value}
                className={cn(
                    "form-input",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                {...register(name, validation)}
            />

            {error && (
                <p className="text-sm text-red-500 mt-1">
                    {error.message || `${label} is required`}
                </p>
            )}
        </div>
    )
}

export default InputField