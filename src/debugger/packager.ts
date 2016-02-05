// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import {IDesktopPlatform} from "./platformResolver";
import {PromiseUtil} from "../utils/node/promise";
import {Request} from "../utils/node/request";
import {CommandExecutor} from "../utils/commands/commandExecutor";
import {Log} from "../utils/commands/log";
import * as Q from "q";

export class Packager {
    public static HOST = "localhost:8081";
    private projectPath: string;
    private desktopPlatform: IDesktopPlatform;

    constructor(projectPath: string, desktopPlatform: IDesktopPlatform) {
        this.projectPath = projectPath;
        this.desktopPlatform = desktopPlatform;
    }

    private isRunning(): Q.Promise<boolean> {
        let statusURL = `http://${Packager.HOST}/status`;

        return new Request().request(statusURL)
            .then((body: string) => {
                return body === "packager-status:running";
            },
            (error: any) => {
                return false;
            });
    }

    private awaitStart(retryCount = 30, delay = 2000): Q.Promise<boolean> {
        let pu: PromiseUtil = new PromiseUtil();
        return pu.retryAsync(() => this.isRunning(), (running) => running, retryCount, delay, "Could not start the packager.");
    }

    public start(): Q.Promise<void> {
        this.isRunning().done(running => {
            if (!running) {
                let mandatoryArgs = ["start"];
                let args = mandatoryArgs.concat(this.desktopPlatform.reactPackagerExtraParameters);
                let childEnv = Object.assign({}, process.env, { REACT_DEBUGGER: "echo A debugger is not needed: " });

                // The packager will continue running while we debug the application, so we can"t
                // wait for this command to finish
                new CommandExecutor(this.projectPath).spawn(this.desktopPlatform.reactNativeCommandName, args, { env: childEnv }).done();
            }
        });

        return this.awaitStart().then(() => {
            Log.logMessage("Packager started.");
        });
    }
}